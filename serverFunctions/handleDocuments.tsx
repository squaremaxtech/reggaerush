"use server"
import { uploadedImagesDirectory, uploadedInvoicesDirectory } from "@/types/uploadTypes"
import path from "path";
import fs from "fs/promises";
import { dbFileType } from "@/types";

export async function deleteInvoices(invoiceSrcs: dbFileType["src"][]) {
    //remove file
    await Promise.all(
        invoiceSrcs.map(async eachSrc => {
            const baseFolderPath = path.join(uploadedInvoicesDirectory, eachSrc)

            await fs.rm(baseFolderPath, { force: true, recursive: true })
        })
    )
}

export async function deleteImages(imageSrcs: dbFileType["src"][]) {
    //remove file
    await Promise.all(
        imageSrcs.map(async eachSrc => {
            const baseFolderPath = path.join(uploadedImagesDirectory, eachSrc)

            await fs.rm(baseFolderPath, { force: true, recursive: true })
        })
    )
}