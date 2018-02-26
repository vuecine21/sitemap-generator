import chrome from 'sinon-chrome';
import chai from 'chai';
import BackgroundApi from '../src/background/backgroundApi';
import BackgroundEvents from '../src/background/events.js'; 

chai.expect();
require('jsdom-global')();
const expect = chai.expect;

describe('Event pages', () => {

    // describe('Background Api', () => {
    //     before(function () {
    //         window.chrome = chrome;
    //     });
    //     it('should render without error', () => {
    //         expect(() => {
    //             new BackgroundApi()
    //         }).to.not.throw();
    //     });
    //     it('tabId should respond with sender', function (done) {
    //         BackgroundApi.backgroundApi({tabId: 1}, 'sender', (res) => {
    //             expect(res).to.equal('sender');
    //             done();
    //         });
    //     });
    //     it('share should try to open window', () => {
    //         expect(() => {
    //             BackgroundApi.backgroundApi({share: {width: 200, height: 200, url: "https://t.co"}})
    //         }).to.not.throw();
    //     });
    //     it('invalid request does nothing', () => {
    //         expect(BackgroundApi.backgroundApi({dontExist: 1})).to.be.false;
    //     });
    // });

    describe('Background Events', () => {
        before(() => {
            window.chrome = chrome;
        });
        it('should render without error', () => {
            expect(() => {
                new BackgroundEvents()
            }).to.not.throw();
        });
        it('should open intro page on install', () => {
            expect(() => {
                BackgroundEvents.onInstalledEvent({reason: "install"})
            }).to.not.throw();
        });
        it('should ignore updates', () => {
            expect(() => {
                BackgroundEvents.onInstalledEvent({reason: "update"})
            }).to.not.throw();
        });
    });
});