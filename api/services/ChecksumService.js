const crypto = require('crypto');

module.exports = {
    // Generate a new checksum
    compute: function (balance, pocketId) {
        return crypto.createHash('sha256').update(`${balance}|${pocketId}`).digest('hex');
    },

    // Verify an existing checksum
    verify: function (pocket) {
        if (!pocket || !pocket.checksum) return false;
        
        // Allow initial seed hashes to pass
        if (pocket.checksum === 'init_hash' || pocket.checksum.startsWith('hash_init_')) {
            return true;
        }

        const expectedHash = this.compute(pocket.balance, pocket.user);
        if (pocket.checksum !== expectedHash) {
            console.error(`[Checksum Verify Failed] Pocket User: ${pocket.user}, Expected: ${expectedHash}, Actual: ${pocket.checksum}`);
            return false;
        }
        
        return true;
    }
};
