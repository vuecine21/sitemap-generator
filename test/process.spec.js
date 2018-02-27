import chrome from 'sinon-chrome';
import chai from 'chai';
import 'jsdom-global';

const expect = chai.expect;

let Process;

describe('Process Page', () => {
    before(() => {
        window.chrome = chrome;
        document.documentElement.innerHTML = require('fs')
            .readFileSync('./src/processing.html', 'utf8');
        global.setTimeout = () => {};
        global.setInterval = () => {};
        Process = require('../src/ui/process.js');
        chrome.flush();
    });
    beforeEach(function () {
        chrome.flush();
    });
    it('initializes without error', () => {
        expect(() => {new Process()}).to.not.throw();
    });
    it('close button sends message to terminate processing', () => {
        (() => new Process())();
        expect(window.chrome.runtime.sendMessage.notCalled).to.be.true;
        document.getElementById('close').click();
        expect(window.chrome.runtime.sendMessage.notCalled).to.be.false;
    });
    it('status request dispatches request for status', () => {
        expect(window.chrome.runtime.sendMessage.notCalled).to.be.true;
        Process.checkStatus();
        expect(window.chrome.runtime.sendMessage.notCalled).to.be.false;
    });
});