const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');

async function resetPasswords() {
    try {
        // Hash for 'Admin@123'
        const adminHash = await bcrypt.hash('Admin@123', 10);
        
        // Hash for 'Member@123'
        const memberHash = await bcrypt.hash('Member@123', 10);
        
        // Update admin users
        await query(
            `UPDATE users 
             SET password_hash = $1 
             WHERE email IN ('superadmin@awash.com', 'leader@awashmain.com')`,
            [adminHash]
        );
        
        // Update member users
        await query(
            `UPDATE users 
             SET password_hash = $1 
             WHERE email IN ('member@awashmain.com', 'member2@awashmain.com')`,
            [memberHash]
        );
        
        console.log('✅ Passwords reset successfully!');
        console.log('Super Admin / Edir Leader password: Admin@123');
        console.log('Member password: Member@123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting passwords:', error);
        process.exit(1);
    }
}

resetPasswords();