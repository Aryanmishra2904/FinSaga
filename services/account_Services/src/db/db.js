import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    log : production.env.NODE_ENV === "devlopment" ? ["query","warn","error"] : ["error"],
});

const connectDB = async () => {
try {
    await prisma.$connect();
    console.log("DB connected via prisma")
} catch (error) {
    console.error("DB connection error")
    process.exit(1);
    
}
}


const disconnectDB = async () =>{
        await prisma.$disconnect();
}

export { prisma,connectDB,disconnectDB }