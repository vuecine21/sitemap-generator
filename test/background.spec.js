import chrome from 'sinon-chrome';
import chai from 'chai';
import BackgroundEvents from '../src/background/events.js';
import BackgroundApi from '../src/background/backgroundApi.js';
import Generator from '../src/background/generator.js';
import backgroundApi from '../src/background/backgroundApi.js';

chai.expect();
require('jsdom-global')();
const expect = chai.expect;

let url = "https://www.test.com/",
    requestDomain = url + "/*",
    testPages = {
        a: "https://www.test.com/index.html",
        b: "https://www.test.com/about.html",
        c: "https://www.test.com/home.html",
        d: "https://www.nottest.com/index.html"
    },
    defaultConfig = { url: url, requestDomain: requestDomain },
    defaultSender = { tab: { id: 1 } }

describe('Event pages', () => {

    describe('Background Events', () => {
        before(() => {
            window.chrome = chrome;
        });
        it('constructor should register chrome onInstall listener', () => {
            expect(window.chrome.runtime.onInstalled.addListener.notCalled).to.be.true;
            new BackgroundEvents();
            expect(window.chrome.runtime.onInstalled.addListener.notCalled).to.not.be.true;
        });
        it('should open intro page on install', () => {
            expect(() => {
                BackgroundEvents.onInstalledEvent({ reason: "install" })
            }).to.not.throw();
        });
        it('should ignore updates', () => {
            expect(() => {
                BackgroundEvents.onInstalledEvent({ reason: "update" })
            }).to.not.throw();
        });
    });

    describe('Background Api', () => {
        before(() => {
            window.chrome = chrome;
            window.alert = () => { };
        });
        it('constructor should register chrome listeners', () => {
            expect(window.chrome.runtime.onMessage.addListener.notCalled).to.be.true;
            expect(window.chrome.browserAction.onClicked.addListener.notCalled).to.be.true;
            new BackgroundApi();
            expect(window.chrome.runtime.onMessage.addListener.notCalled).to.not.be.true;
            expect(window.chrome.browserAction.onClicked.addListener.notCalled).to.not.be.true;
        });
        it('openSetupPage launches only if generator does not exist', () => {
            backgroundApi.onStartGenerator(defaultConfig);
            expect(BackgroundApi.openSetupPage({ url: testPages.a })).to.be.false;
            backgroundApi.onCrawlComplete();
            expect(BackgroundApi.openSetupPage({ url: testPages.a })).to.not.be.false;
        });
        it('openSetupPage manipulates tab url without error', () => {
            expect(() => { BackgroundApi.openSetupPage({ url: "chrome://about" }); }).to.not.throw();
            expect(() => { BackgroundApi.openSetupPage({ url: testPages.a }); }).to.not.throw();
        });
        it('launchRequest executes without error', () => {
            expect(BackgroundApi.launchRequest({ start: defaultConfig }, defaultSender)).to.be.true;
        });
        it('generator does not try to start when config not provided', () => {
            expect(BackgroundApi.launchRequest({ incorrect: defaultConfig }, defaultSender)).to.be.false;
        });
        it('generator does not try to start when permission not granted', () => {
            expect(BackgroundApi.handleGrantResponse(false)).to.be.false;
        });
        it('generator does not try to start when already exists', () => {
            backgroundApi.onStartGenerator(defaultConfig);
            expect(backgroundApi.onStartGenerator(defaultConfig)).to.be.false;
        });
        it('generator does not try to start when does not exist, permission granted, and config provided', () => {
            backgroundApi.onCrawlComplete(); // kill any existing intanse
            expect(BackgroundApi.handleGrantResponse(true, defaultConfig)).to.not.be.false;
        });
    });

    describe('Generator', () => {
        beforeEach(() => {
            window.chrome.flush();
        });
        // it('should initialize without error', () => {
        //     expect(() => { new Generator(defaultConfig) }).to.not.throw();
        // });
        afterEach(() => {
            backgroundApi.onCrawlComplete();
        });
    });
});