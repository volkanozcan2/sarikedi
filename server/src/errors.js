/**
 * Sunucu genelinde kullanılan hata türleri; hata işleyicisi bunları HTTP durum koduna çevirir.
 */

class ValidationError extends Error {
    constructor (errors, message) {
        super(message || 'Ders geçersiz');
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

class NotFoundError extends Error {
    constructor (message) {
        super(message || 'Ders bulunamadı');
        this.name = 'NotFoundError';
    }
}

class ConflictError extends Error {
    constructor (message) {
        super(message || 'Bu kimlikte bir ders zaten var');
        this.name = 'ConflictError';
    }
}

class UnsupportedError extends Error {
    constructor (message) {
        super(message || 'Desteklenmeyen dosya türü');
        this.name = 'UnsupportedError';
    }
}

class TooLargeError extends Error {
    constructor (message) {
        super(message || 'Dosya çok büyük');
        this.name = 'TooLargeError';
    }
}

module.exports = {ValidationError, NotFoundError, ConflictError, UnsupportedError, TooLargeError};
