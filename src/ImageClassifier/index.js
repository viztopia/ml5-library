// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/*
Image Classifier using pre-trained networks
*/

import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as darknet from './darknet';
import * as doodlenet from './doodlenet';
import callCallback from '../utils/callcallback';
import { imgToTensor } from '../utils/imageUtilities';

const DEFAULTS = {
  mobilenet: {
    version: 1,
    alpha: 1.0,
    topk: 3,
  },
};
const IMAGE_SIZE = 224;
const MODEL_OPTIONS = ['mobilenet', 'darknet', 'darknet-tiny', 'doodlenet'];

class ImageClassifier {
  /**
   * Create an ImageClassifier.
   * @param {modelNameOrUrl} modelNameOrUrl - The name or the URL of the model to use. Current model name options 
   *    are: 'mobilenet', 'darknet', 'darknet-tiny', and 'doodlenet'.
   * @param {HTMLVideoElement} video - An HTMLVideoElement.
   * @param {object} options - An object with options.
   * @param {function} callback - A callback to be called when the model is ready.
   */
  constructor(modelNameOrUrl, video, options, callback) {
    this.video = video;
    this.model = null;
    this.mapStringToIndex = [];
    if (typeof modelNameOrUrl === 'string') {
      if (MODEL_OPTIONS.includes(modelNameOrUrl)) {
        this.modelName = modelNameOrUrl;
        this.modelUrl = null;
        switch (this.modelName) {
          case 'mobilenet':
            this.modelToUse = mobilenet;
            this.version = options.version || DEFAULTS.mobilenet.version;
            this.alpha = options.alpha || DEFAULTS.mobilenet.alpha;
            this.topk = options.topk || DEFAULTS.mobilenet.topk;
            break;
          case 'darknet':
            this.version = 'reference'; // this a 28mb model
            this.modelToUse = darknet;
            break;
          case 'darknet-tiny':
            this.version = 'tiny'; // this a 4mb model
            this.modelToUse = darknet;
            break;
          case 'doodlenet':
            this.modelToUse = doodlenet;
            break;
          default:
            this.modelToUse = null;
        }
      } else {
        this.modelUrl = modelNameOrUrl;
      }
    }
    // Load the model
    this.ready = callCallback(this.loadModel(this.modelUrl), callback);
  }

  /**
   * Load the model and set it to this.model
   * @return {this} The ImageClassifier.
   */
  async loadModel(modelUrl) {
    if (modelUrl) this.model = await this.loadModelFrom(modelUrl);
    else this.model = await this.modelToUse.load(this.version, this.alpha);
    return this;
  }

  async loadModelFrom(path = null) {
    fetch(path)
    .then(r => r.json())
    .then((r) => {
      if (r.ml5Specs) {
        this.mapStringToIndex = r.ml5Specs.mapStringToIndex;
      }
    });
    this.model = await tf.loadLayersModel(path);
    return this.model;
  }

  /**
   * Classifies the given input and returns an object with labels and confidence
   * @param {HTMLImageElement | HTMLCanvasElement | HTMLVideoElement} imgToPredict - 
   *    takes an image to run the classification on.
   * @param {number} numberOfClasses - a number of labels to return for the image 
   *    classification.
   * @return {object} an object with {label, confidence}.
   */
  async classifyInternal(imgToPredict, numberOfClasses) {
    // Wait for the model to be ready
    await this.ready;
    await tf.nextFrame();

    if (imgToPredict instanceof HTMLVideoElement && imgToPredict.readyState === 0) {
      const video = imgToPredict;
      // Wait for the video to be ready
      await new Promise(resolve => {
        video.onloadeddata = () => resolve();
      });
    }

    if (this.video && this.video.readyState === 0) {
      await new Promise(resolve => {
        this.video.onloadeddata = () => resolve();
      });
    }

    if (this.modelUrl) {
      await tf.nextFrame();
      const predictedClasses = tf.tidy(() => {
        const imageResize = [IMAGE_SIZE, IMAGE_SIZE];
        const processedImg = imgToTensor(imgToPredict, imageResize);
        const predictions = this.model.predict(processedImg);
        return Array.from(predictions.as1D().dataSync());
      });
      const results = await predictedClasses.map((confidence, index) => {
        const label = (this.mapStringToIndex.length > 0 && this.mapStringToIndex[index]) ? this.mapStringToIndex[index] : index;
        return {
          label,
          confidence,
        };
      }).sort((a, b) => b.confidence - a.confidence);
      return results;
    }
    return this.model
      .classify(imgToPredict, numberOfClasses)
      .then(classes => classes.map(c => ({ label: c.className, confidence: c.probability })));
  }

  /**
   * Classifies the given input and takes a callback to handle the results
   * @param {HTMLImageElement | HTMLCanvasElement | object | function | number} inputNumOrCallback - 
   *    takes any of the following params
   * @param {HTMLImageElement | HTMLCanvasElement | object | function | number} numOrCallback - 
   *    takes any of the following params
   * @param {function} cb - a callback function that handles the results of the function.
   * @return {function} a promise or the results of a given callback, cb.
   */
  async classify(inputNumOrCallback, numOrCallback = null, cb) {
    let imgToPredict = this.video;
    let numberOfClasses = this.topk;
    let callback;

    // Handle the image to predict
    if (typeof inputNumOrCallback === 'function') {
      imgToPredict = this.video;
      callback = inputNumOrCallback;
    } else if (typeof inputNumOrCallback === 'number') {
      imgToPredict = this.video;
      numberOfClasses = inputNumOrCallback;
    } else if (inputNumOrCallback instanceof HTMLImageElement) {
      imgToPredict = inputNumOrCallback;
    } else if (
      typeof inputNumOrCallback === 'object' &&
      inputNumOrCallback.elt instanceof HTMLImageElement
    ) {
      imgToPredict = inputNumOrCallback.elt; // Handle p5.js image
    } else if (inputNumOrCallback instanceof HTMLCanvasElement) {
      imgToPredict = inputNumOrCallback;
    } else if (
      typeof inputNumOrCallback === 'object' &&
      inputNumOrCallback.elt instanceof HTMLCanvasElement
    ) {
      imgToPredict = inputNumOrCallback.elt; // Handle p5.js image
    } else if (
      typeof inputNumOrCallback === 'object' &&
      inputNumOrCallback.canvas instanceof HTMLCanvasElement
    ) {
      imgToPredict = inputNumOrCallback.canvas; // Handle p5.js image
    } else if (inputNumOrCallback instanceof HTMLVideoElement) {
      imgToPredict = inputNumOrCallback;
    } else if (
      typeof inputNumOrCallback === 'object' &&
      inputNumOrCallback.elt instanceof HTMLVideoElement
    ) {
      imgToPredict = inputNumOrCallback.elt; // Handle p5.js video
    } else if (!(this.video instanceof HTMLVideoElement)) {
      // Handle unsupported input
      throw new Error(
        'No input image provided. If you want to classify a video, pass the video element in the constructor. ',
      );
    }

    if (typeof numOrCallback === 'number') {
      numberOfClasses = numOrCallback;
    } else if (typeof numOrCallback === 'function') {
      callback = numOrCallback;
    }

    if (typeof cb === 'function') {
      callback = cb;
    }

    return callCallback(this.classifyInternal(imgToPredict, numberOfClasses), callback);
  }

  /**
   * Will be deprecated soon in favor of ".classify()" - does the same as .classify()
   * @param {HTMLImageElement | HTMLCanvasElement | object | function | number} inputNumOrCallback - takes any of the following params
   * @param {HTMLImageElement | HTMLCanvasElement | object | function | number} numOrCallback - takes any of the following params
   * @param {function} cb - a callback function that handles the results of the function.
   * @return {function} a promise or the results of a given callback, cb.
   */
  async predict(inputNumOrCallback, numOrCallback, cb) {
    return this.classify(inputNumOrCallback, numOrCallback || null, cb);
  }
}

const imageClassifier = (modelName, videoOrOptionsOrCallback, optionsOrCallback, cb) => {
  let model;
  let video;
  let options = {};
  let callback = cb;

  if (typeof modelName === 'string') {
    model = modelName.toLowerCase();
  } else {
    throw new Error('Please specify a model to use. E.g: "MobileNet"');
  }

  if (videoOrOptionsOrCallback instanceof HTMLVideoElement) {
    video = videoOrOptionsOrCallback;
  } else if (
    typeof videoOrOptionsOrCallback === 'object' &&
    videoOrOptionsOrCallback.elt instanceof HTMLVideoElement
  ) {
    video = videoOrOptionsOrCallback.elt; // Handle a p5.js video element
  } else if (typeof videoOrOptionsOrCallback === 'object') {
    options = videoOrOptionsOrCallback;
  } else if (typeof videoOrOptionsOrCallback === 'function') {
    callback = videoOrOptionsOrCallback;
  }

  if (typeof optionsOrCallback === 'object') {
    options = optionsOrCallback;
  } else if (typeof optionsOrCallback === 'function') {
    callback = optionsOrCallback;
  }

  const instance = new ImageClassifier(model, video, options, callback);
  return callback ? instance : instance.ready;
};

export default imageClassifier;
