## 2026-07-15T05:34:44Z
You are teamwork_preview_explorer. Your working directory is /workspaces/DNA/.agents/explorer_m7_3.
Your task is to explore how WebAssembly (Wasm) contract execution is implemented in the DNA project, analyze the current dependency on Wagon interpreter, and propose a concrete architecture and plan for integrating wazero as the optimized execution engine.
Specifically:
1. Locate where Wagon is imported and used (e.g., smartcontract/service/wasmvm/, wasmtest/wasm-test.go).
2. Detail how host functions, gas tracking, memory limits, and panic recovery are handled under Wagon.
3. Explain how Wazero can implement the same behavior (host functions mapping, memory limits, gas counter/metrics).
4. Provide a clear design/strategy for replacing Wagon with Wazero.
5. Write your findings to /workspaces/DNA/.agents/explorer_m7_3/analysis.md and write a handoff.md when finished.
Notify the parent agent via send_message when complete.
