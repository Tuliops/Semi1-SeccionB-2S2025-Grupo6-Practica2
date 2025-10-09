// Reemplaza tu código actual de subida de imágenes con:
const { BlobServiceClient } = require("@azure/storage-blob");

async function uploadProfileImage(imageFile, userId) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("profile-pictures");
        
        // Crear nombre único para la imagen
        const blobName = `profile-${userId}-${Date.now()}.jpg`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Subir la imagen
        await blockBlobClient.uploadData(imageFile.buffer, {
            blobHTTPHeaders: { blobContentType: imageFile.mimetype }
        });
        
        // Retornar URL pública
        return blockBlobClient.url;
    } catch (error) {
        throw new Error(`Error uploading to Azure: ${error.message}`);
    }
}