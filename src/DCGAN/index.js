// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/*
DCGAN
This version is based on alantian's TensorFlow.js implementation: https://github.com/alantian/ganshowcase
*/

import * as tf from '@tensorflow/tfjs';
import callCallback from '../utils/callcallback';
import * as p5Utils from '../utils/p5Utils';

// Default pre-trained face model

// const DEFAULT = {
//     "description": "DCGAN, human faces, 64x64",
//     "model": "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/master/models/dcgan/face/model.json",
//     "modelSize": 64,
//     "modelLatentDim": 128
// }

class DCGANBase {
    /**
     * Create an DCGAN.
     * @param {modelName} modelName - The name of the model to use.
     * @param {function} readyCb - A callback to be called when the model is ready.
     */
    constructor(modelPath, callback) {
        this.model = {};
        this.modelPath = modelPath;
        this.modelInfo = {};
        this.modelPathPrefix = '';
        this.modelReady = false;
        this.ready = callCallback(this.loadModel(), callback);
    }

    /**
     * Load the model and set it to this.model
     * @return {this} the dcgan.
     */
    async loadModel() {
        const modelInfo = await fetch(this.modelPath);
        const modelInfoJson = await modelInfo.json();

        this.modelInfo = modelInfoJson
        
        const [modelUrl] = this.modelPath.split('manifest.json')
        const modelJsonPath = this.isAbsoluteURL(modelUrl) ? this.modelInfo.model : this.modelPathPrefix + this.modelInfo.model

        this.model = await tf.loadLayersModel(modelJsonPath);
        this.modelReady = true;
        return this;
    }

    /**
     * Generates a new image
     * @param {function} callback - a callback function handle the results of generate
     * @return {object} a promise or the result of the callback function.
     */
    async generate(callback) {
        await this.ready;
        return callCallback(this.generateInternal(), callback);
    }

    /**
     * Computes what will become the image tensor
     * @param {number} latentDim - the number of latent dimensions to pass through
     * @return {object} a tensor
     */
    async compute(latentDim) {
        const y = tf.tidy(() => {
            const z = tf.randomNormal([1, latentDim]);
            // TBD: should model be a parameter to compute or is it ok to reference this.model here?
            const yDim = this.model.predict(z).squeeze().transpose([1, 2, 0]).div(tf.scalar(2)).add(tf.scalar(0.5));
            return yDim;
        });

        return y;
    }

    /**
     * Takes the tensor from compute() and returns an object of the generate image data
     * @return {object} includes blob, raw, and tensor. if P5 exists, then a p5Image
     */
    async generateInternal() {
        const {
            modelLatentDim
        } = this.modelInfo;
        const imageTensor = await this.compute(modelLatentDim);

        // get the raw data from tensor
        const raw = await tf.browser.toPixels(imageTensor);

        // get the blob from raw
        const [imgHeight, imgWidth] = imageTensor.shape;
        const blob = await p5Utils.rawToBlob(raw, imgWidth, imgHeight);

        // get the p5.Image object
        let p5Image;
        if (p5Utils.checkP5()) {
            p5Image = await p5Utils.blobToP5Image(blob);
        }

        // wrap up the final js result object
        const result = {};
        result.blob = blob;
        result.raw = raw;
        result.tensor = imageTensor;

        if (p5Utils.checkP5()) {
            result.image = p5Image;
        }

        return result;

    }

    
    /* eslint class-methods-use-this: "off" */
    isAbsoluteURL(str) {
        const pattern = new RegExp('^(?:[a-z]+:)?//', 'i');
        return !!pattern.test(str);
    }

}

const DCGAN = (modelPath, cb) => {

    if (typeof modelPath !== 'string') {
        throw new Error(`Please specify a path to a "manifest.json" file: \n
         "models/face/manifest.json" \n\n
         This "manifest.json" file should include:\n
         {
            "description": "DCGAN, human faces, 64x64",
            "model": "https://raw.githubusercontent.com/viztopia/ml5dcgan/master/model/model.json", // "https://github.com/viztopia/ml5dcgan/blob/master/model/model.json",
            "modelSize": 64,
            "modelLatentDim": 128 
         }
         `);
    }
    

    const instance = new DCGANBase(modelPath, cb);
    return cb ? instance : instance.ready;
    
}

export default DCGAN;