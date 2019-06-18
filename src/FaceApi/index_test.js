// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {
    faceApi
} = ml5;

const FACEAPI_DEFAULTS = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    MODEL_URLS: {
        Mobilenetv1Model: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/ssd_mobilenetv1_model-weights_manifest.json',
        FaceLandmarkModel: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_landmark_68_model-weights_manifest.json',
        FaceLandmark68TinyNet: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_landmark_68_tiny_model-weights_manifest.json',
        FaceRecognitionModel: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_recognition_model-weights_manifest.json',
        FaceExpressionModel: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_expression_model-weights_manifest.json'
    }
}


describe('faceApi', () => {
    let faceapi;

    async function getImage() {
        const img = new Image();
        img.crossOrigin = true;
        img.src = 'https://raw.githubusercontent.com/ml5js/ml5-examples/face-api/p5js/FaceApi/FaceApi_Image_Landmarks/assets/frida.jpg';
        await new Promise((resolve) => {
            img.onload = resolve;
        });
        return img;
    }

    async function getCanvas() {
        const img = await getImage();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas;
    }

    beforeEach(async () => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
        faceapi = await faceApi();
    });

    it('Should create faceApi with all the defaults', async () => {
        expect(faceapi.config.withLandmarks).toBe(FACEAPI_DEFAULTS.withLandmarks);
        expect(faceapi.config.withExpressions).toBe(FACEAPI_DEFAULTS.withExpressions);
        expect(faceapi.config.withDescriptors).toBe(FACEAPI_DEFAULTS.withDescriptors);
    });

    describe('expressions', () => {
        it('Should get expressions for Frida', async () => {
            const img = await getImage();
            await faceapi.detectSingle(img)
                .then(results => {
                    expect(results.expressions).toEqual(jasmine.any(Object));

                })
        });
    });
    
    describe('landmarks', () => {
        it('Should get landmarks for Frida', async () => {
            const img = await getImage();
            await faceapi.detectSingle(img)
                .then(results => {
                    expect(results.landmarks).toEqual(jasmine.any(Object));

                })
        });
    });
});