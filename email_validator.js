function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

function validateEmailList(emails) {
    const validEmails = [];
    const invalidEmails = [];
    for (const email of emails) {
        if (validateEmail(email)) {
            validEmails.push(email);
        } else {
            invalidEmails.push(email);
        }
    }
    return { validEmails, invalidEmails };
}

function validateEmailDomain(email) {
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const domain = email.split("@")[1];
    return domainRegex.test(domain);
}

function validateEmailLocalPart(email) {
    const localPartRegex = /^[a-zA-Z0-9._%+-]+$/;
    const localPart = email.split("@")[0];
    return localPartRegex.test(localPart);
}

// Example usage:
const email = "example@example.com";
if (validateEmail(email)) {
    console.log(`${email} is a valid email address.`);
} else {
    console.log(`${email} is not a valid email address.`);
}

const emails = [
    "example1@example.com",
    "invalid-email",
    "example2@example.com",
    "another-invalid-email",
    "example3@example.com"
];
const { validEmails, invalidEmails } = validateEmailList(emails);
console.log(`Valid emails: ${validEmails.join(', ')}`);
console.log(`Invalid emails: ${invalidEmails.join(', ')}`);

const domain = "example.com";
if (validateEmailDomain(`user@${domain}`)) {
    console.log(`Domain ${domain} is valid.`);
} else {
    console.log(`Domain ${domain} is not valid.`);
}

const localPart = "user";
if (validateEmailLocalPart(`${localPart}@example.com`)) {
    console.log(`Local part ${localPart} is valid.`);
} else {
    console.log(`Local part ${localPart} is not valid.`);
}