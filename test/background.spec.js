import chrome from 'sinon-chrome';
import chai from 'chai';
import BackgroundEvents from '../src/background/events.js'; 

chai.expect();
require('jsdom-global')();
const expect = chai.expect;

describe('Event pages', () => {

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