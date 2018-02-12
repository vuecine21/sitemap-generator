var chai = require('chai');
var _require = require('./_exports');
var generator = _require('./src/generator.js');

chai.expect();
var expect = chai.expect;

describe('Sitemap Generator', function () {
    it("should be defined", function () {
        return expect(generator.sitemapGenerator).not.be.undefined;
    });
});
