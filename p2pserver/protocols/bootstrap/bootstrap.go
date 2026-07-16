// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team
//
/*
 * Copyright (C) 2018 The ontology Authors
 * This file is part of The ontology library.
 *
 * The ontology is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * The ontology is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with The ontology.  If not, see <http://www.gnu.org/licenses/>.
 */
package bootstrap

import (
	"fmt"
	"io"
	"math/rand"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/DNAProject/DNA/bootstrapserver"
	"github.com/DNAProject/DNA/common/config"
	"github.com/DNAProject/DNA/common/log"
	"github.com/DNAProject/DNA/p2pserver/common"
	msgpack "github.com/DNAProject/DNA/p2pserver/message/msg_pack"
	"github.com/DNAProject/DNA/p2pserver/message/types"
	p2p "github.com/DNAProject/DNA/p2pserver/net/protocol"
	"github.com/DNAProject/DNA/p2pserver/peer"
)

const activeConnect = 4 // when connection num less than this value, we connect seeds node actively.

type BootstrapService struct {
	seeds     []string
	connected uint
	net       p2p.P2P
	quit      chan bool
}

func NewBootstrapService(net p2p.P2P, seeds []string) *BootstrapService {
	return &BootstrapService{
		seeds: seeds,
		net:   net,
		quit:  make(chan bool),
	}
}

func (self *BootstrapService) Start() {
	self.registerSelf()
	self.queryDynamicSeeds()
	go self.connectSeedService()
	go self.heartbeatService()
}

func (self *BootstrapService) Stop() {
	close(self.quit)
}

func (self *BootstrapService) OnAddPeer(info *peer.PeerInfo) {
	self.connected += 1
}

func (self *BootstrapService) OnDelPeer(info *peer.PeerInfo) {
	self.connected -= 1
}

//connectSeedService make sure seed peer be connected
func (self *BootstrapService) connectSeedService() {
	t := time.NewTimer(0) // let it timeout to start connect immediately
	for {
		select {
		case <-t.C:
			self.connectSeeds()
			t.Stop()
			if self.connected >= activeConnect {
				t.Reset(time.Second * time.Duration(10*common.CONN_MONITOR))
			} else {
				t.Reset(time.Second * common.CONN_MONITOR)
			}
		case <-self.quit:
			t.Stop()
			return
		}
	}
}

//connectSeeds connect the seeds in seedlist and call for nbr list
func (self *BootstrapService) connectSeeds() {
	self.queryDynamicSeeds()
	seedNodes := make([]string, 0)
	for _, n := range self.seeds {
		ip, err := common.ParseIPAddr(n)
		if err != nil {
			log.Warnf("[p2p]seed peer %s address format is wrong", n)
			continue
		}
		ns, err := net.LookupHost(ip)
		if err != nil {
			log.Warnf("[p2p]resolve err: %s", err.Error())
			continue
		}
		port, err := common.ParseIPPort(n)
		if err != nil {
			log.Warnf("[p2p]seed peer %s address format is wrong", n)
			continue
		}
		seedNodes = append(seedNodes, ns[0]+port)
	}

	connPeers := make(map[string]*peer.Peer)
	nps := self.net.GetNeighbors()
	for _, tn := range nps {
		listenAddr := tn.Info.RemoteListenAddress()
		connPeers[listenAddr] = tn
	}

	seedConnList := make([]*peer.Peer, 0)
	seedDisconn := make([]string, 0)
	isSeed := false
	for _, nodeAddr := range seedNodes {
		if p, ok := connPeers[nodeAddr]; ok {
			seedConnList = append(seedConnList, p)
		} else {
			seedDisconn = append(seedDisconn, nodeAddr)
		}

		if self.net.IsOwnAddress(nodeAddr) {
			isSeed = true
		}
	}

	if len(seedConnList) > 0 {
		rand.Seed(time.Now().UnixNano())
		// close NewAddrReq
		index := rand.Intn(len(seedConnList))
		self.reqNbrList(seedConnList[index])
		if isSeed && len(seedDisconn) > 0 {
			index := rand.Intn(len(seedDisconn))
			go self.net.Connect(seedDisconn[index])
		}
	} else { //not found
		for _, nodeAddr := range seedNodes {
			go self.net.Connect(nodeAddr)
		}
	}
}

func (this *BootstrapService) reqNbrList(p *peer.Peer) {
	id := p.GetID()
	var msg types.Message
	if id.IsPseudoPeerId() {
		msg = msgpack.NewAddrReq()
	} else {
		msg = msgpack.NewFindNodeReq(this.net.GetID())
	}

	go this.net.SendTo(id, msg)
}

func (self *BootstrapService) heartbeatService() {
	server := config.DefConfig.P2PNode.HttpBootstrapServer
	if server == "" {
		return
	}
	t := time.NewTicker(2 * time.Minute)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			self.registerSelf()
			self.queryDynamicSeeds()
		case <-self.quit:
			return
		}
	}
}

func (self *BootstrapService) registerSelf() {
	server := config.DefConfig.P2PNode.HttpBootstrapServer
	if server == "" {
		return
	}
	port := config.DefConfig.P2PNode.NodePort
	pubkey := config.LocalPubKey
	address := config.LocalAddress
	regIP := os.Getenv("DNA_REGISTRATION_IP")
	url := fmt.Sprintf("%s/register?port=%d&pubkey=%s&address=%s", server, port, pubkey, address)
	if regIP != "" {
		url = fmt.Sprintf("%s&ip=%s", url, regIP)
	}
	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		log.Warnf("[p2p] failed to register to http bootstrap server: %v", err)
		return
	}
	resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Infof("[p2p] registered with http bootstrap server %s (port %d, pubkey %s, address %s, regIP %s)", server, port, pubkey, address, regIP)
	} else {
		log.Warnf("[p2p] http bootstrap register returned status %d", resp.StatusCode)
	}
}

func (self *BootstrapService) queryDynamicSeeds() {
	server := config.DefConfig.P2PNode.HttpBootstrapServer
	var newSeeds []string
	if server != "" {
		resp, err := http.Get(server + "/peers")
		if err == nil {
			defer resp.Body.Close()
			body, readErr := io.ReadAll(resp.Body)
			if readErr == nil {
				if peers, parseErr := bootstrapserver.ParsePeerList(body); parseErr == nil {
					newSeeds = append(newSeeds, peers...)
					if len(peers) > 0 {
						log.Debugf("[p2p] fetched %d peers from http bootstrap server", len(peers))
					}
				}
			}
		} else {
			log.Warnf("[p2p] failed to query http bootstrap peers: %v", err)
		}
	}

	for _, seeder := range config.DefConfig.P2PNode.DnsSeeders {
		ips, err := net.LookupHost(seeder)
		if err == nil {
			port := config.DefConfig.P2PNode.NodePort
			for _, ip := range ips {
				newSeeds = append(newSeeds, fmt.Sprintf("%s:%d", ip, port))
			}
		}
	}

	if len(newSeeds) > 0 {
		seedMap := make(map[string]bool)
		for _, s := range self.seeds {
			seedMap[s] = true
		}
		for _, s := range newSeeds {
			if !seedMap[s] {
				self.seeds = append(self.seeds, s)
				seedMap[s] = true
			}
		}
	}
}
