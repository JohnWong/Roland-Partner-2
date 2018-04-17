/**
 * Created by kako on 2017/08/31.
 */

var PP2_CRYPT = (function() {
    var secret = undefined;
    var __ = {
        init: function(encryptKey) {
            secret = CryptoJS.enc.Utf8.parse(encryptKey);
        },
        encrypt: function(value) {
            var salt = CryptoJS.lib.WordArray.random(128 / 8);
            var iv = CryptoJS.lib.WordArray.random(128 / 8);

            var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value), CryptoJS.PBKDF2(secret, salt, {keySize: 128 / 8, iterations: 500}), {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            var hex = CryptoJS.enc.Hex.stringify(salt) + CryptoJS.enc.Hex.stringify(iv) + encrypted.toString().replace(/=/g, '');
            return hex;
        },
        decrypt: function(hex) {
            var salt = CryptoJS.enc.Hex.parse(hex.substr(0, 32));
            var iv = CryptoJS.enc.Hex.parse(hex.substr(32, 32));
            var encrypted_data = CryptoJS.enc.Base64.parse(hex.substr(64));

            var decrypted = CryptoJS.AES.decrypt({ciphertext: encrypted_data}, CryptoJS.PBKDF2(secret, salt, {keySize: 128 / 8, iterations: 500}), {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            return decrypted.toString(CryptoJS.enc.Utf8);
        }
    };
    return __;
})();