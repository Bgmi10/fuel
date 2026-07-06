import { prisma } from "."
import bcrypt from "bcrypt";

const emails = [{
    name: 'subash',
    role: "ADMIN",
    password: "admin123",

    email: "subashchandraboseravi45@gmail.com"}]

async function seedUsers () {
    for (let i = 0; i < emails.length; i++) {
        const hashPass = await bcrypt.hash(emails[i].password, 10);
        await prisma.user.create({
            data: {
                email: emails[i].email,
                name: emails[i].name,
                password: hashPass,
                role: "ADMIN",
            }
        })
    }
}

async function seedSetting () {
    await prisma.setting.create({
        data: {
            cgstPercentage: 2.4,
            sgstPercentage: 3.4
        }
    })
}
seedSetting();
seedUsers();