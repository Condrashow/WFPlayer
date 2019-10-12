import validator from 'option-validator';
import Emitter from './emitter';
import Events from './events';
import Template from './template';
import Drawer from './drawer';
import Decoder from './decoder';
import Loader from './loader';
import Controller from './controller';
import { timeToDuration, clamp, errorHandle } from './utils';

let id = 0;
const instances = [];
export default class WFPlayer extends Emitter {
    static get instances() {
        return instances;
    }

    static get version() {
        return '__VERSION__';
    }

    static get env() {
        return '__ENV__';
    }

    static get default() {
        return {
            container: '#wfplayer',
            mediaElement: null,
            waveColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgb(28, 32, 34)',
            cursor: true,
            cursorColor: '#ff0000',
            progress: true,
            progressColor: 'rgba(255, 255, 255, 0.5)',
            grid: true,
            gridColor: 'rgba(255, 255, 255, 0.05)',
            ruler: true,
            rulerColor: 'rgba(255, 255, 255, 0.5)',
            rulerAtTop: true,
            withCredentials: false,
            cors: false,
            headers: {},
            pixelRatio: window.devicePixelRatio,
            channel: 0,
            perDuration: 10,
            padding: 5,
        };
    }

    static get scheme() {
        return {
            container: 'htmlelement',
            mediaElement: 'null|htmlvideoelement|htmlaudioelement',
            waveColor: 'string',
            backgroundColor: 'string',
            cursor: 'boolean',
            cursorColor: 'string',
            progress: 'boolean',
            progressColor: 'string',
            grid: 'boolean',
            gridColor: 'string',
            ruler: 'boolean',
            rulerColor: 'string',
            rulerAtTop: 'boolean',
            withCredentials: 'boolean',
            cors: 'boolean',
            headers: 'object',
            pixelRatio: (value, type) => {
                errorHandle(type === 'number', 'pixelRatio is not a number');
                return value >= 1 && Number.isInteger(value);
            },
            channel: (value, type) => {
                errorHandle(type === 'number', 'channel is not a number');
                return value >= 0 && Number.isInteger(value);
            },
            perDuration: (value, type) => {
                errorHandle(type === 'number', 'perDuration is not a number');
                return value >= 1 && Number.isInteger(value);
            },
            padding: (value, type) => {
                errorHandle(type === 'number', 'padding is not a number');
                return value >= 0 && Number.isInteger(value);
            },
        };
    }

    constructor(options = {}) {
        super();

        this._zoom = 1;
        this._currentTime = 0;
        this.destroy = false;
        this.options = {};
        this.setOptions(options);

        this.events = new Events(this);
        this.template = new Template(this);
        this.decoder = new Decoder(this);
        this.drawer = new Drawer(this);
        this.controller = new Controller(this);
        this.loader = new Loader(this);

        id += 1;
        this.id = id;
        instances.push(this);
    }

    get currentTime() {
        return this.options.mediaElement ? this.options.mediaElement.currentTime : this._currentTime;
    }

    get duration() {
        return this.options.mediaElement ? this.options.mediaElement.duration : timeToDuration('99:59:59.999');
    }

    get playing() {
        const { mediaElement } = this.options;
        if (mediaElement) {
            return !!(
                mediaElement.currentTime > 0 &&
                !mediaElement.paused &&
                !mediaElement.ended &&
                mediaElement.readyState > 2
            );
        }
        return false;
    }

    setOptions(options = {}) {
        errorHandle(validator.kindOf(options) === 'object', 'setOptions expects to receive object as a parameter');

        if (typeof options.container === 'string') {
            options.container = document.querySelector(options.container);
        }

        if (typeof options.mediaElement === 'string') {
            options.mediaElement = document.querySelector(options.mediaElement);
        }

        this.options = validator(
            {
                ...WFPlayer.default,
                ...this.options,
                ...options,
            },
            WFPlayer.scheme,
        );

        this.emit('options', this.options);
        return this;
    }

    load(target) {
        if (target instanceof HTMLVideoElement || target instanceof HTMLAudioElement) {
            this.options.mediaElement = target;
            target = target.src;
        }
        errorHandle(
            typeof target === 'string',
            `The load target is not a string. If you are loading a mediaElement, make sure the mediaElement.src is not empty.`,
        );
        this.loader.load(target);
        this.emit('load');
        return this;
    }

    seek(time) {
        errorHandle(
            !this.options.mediaElement,
            `If you have used mediaElement, you can't use the seek method, please use the mediaElement.currentTime property.`,
        );
        this._currentTime = clamp(time, 0, this.duration);
        this.drawer.update();
        return this;
    }

    zoom(zoom) {
        errorHandle(
            zoom >= 1 && Number.isInteger(zoom),
            `The zoom method only accepts positive integers greater than or equal to 1.`,
        );
        this._zoom = clamp(zoom, 1, 10);
        this.drawer.update();
        return this;
    }

    exportImage() {
        this.template.exportImage();
        return this;
    }

    destroy() {
        this.destroy = true;
        this.events.destroy();
        this.template.destroy();
        this.drawer.destroy();
        this.controller.destroy();
        this.decoder.destroy();
        this.loader.destroy();
        instances.splice(instances.indexOf(this), 1);
    }
}
