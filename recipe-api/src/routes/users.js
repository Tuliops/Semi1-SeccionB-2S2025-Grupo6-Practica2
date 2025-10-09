// Donde actualizas el perfil del usuario
router.put('/profile', auth, upload.single('profileImage'), async (req, res) => {
    try {
        let profileImageUrl = null;
        
        // Si hay una nueva imagen, subirla a Azure
        if (req.file) {
            profileImageUrl = await uploadProfileImage(req.file, req.user.id);
        }
        
        // Actualizar usuario en la base de datos
        const updatedUser = await User.update(
            { profileImageUrl },
            { where: { id: req.user.id } }
        );
        
        res.json({ profileImageUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});