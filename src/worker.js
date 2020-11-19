/**
 * 音频数据处理worker
 * @Author: zhangxuelian 
 * @Date: 2019-12-03 15:53:01 
 * @Last Modified by: zhangxuelian
 * @Last Modified time: 2019-12-05 15:05:22
 */
var global = this;
global.onmessage = function (e) {
    var receiveData = e.data || {};
    receiveData.action && vioceWorker[receiveData.action]
        && Object.prototype.toString.call(vioceWorker[receiveData.action]) === '[object Function]'
        && vioceWorker[receiveData.action](receiveData);
}

var vioceWorker = {
    sampleRate: 0,
    downsampleRate: 0,
    recordBuffersLeft: [],
    recordBuffersRight: [],
    recordLength: 0,
    config: function (data) {
        var self = this;
        self.sampleRate = data.params.sampleRate;
        self.downsampleRate = data.params.downsampleRate || data.params.sampleRate;
    },
    record: function (data) {
        var self = this;
        var buffersLeft = data.params.inputBufferLeft;
        var buffersRight = data.params.inputBufferRight;
        self.recordBuffersLeft.push(buffersLeft);
        self.recordBuffersRight.push(buffersRight);
        self.recordLength += buffersLeft.length;
    },
    get16KMonoBlob: function (data) {
        var self = this;
        var bufferLeft = self.mergeBuffers(self.recordBuffersLeft, self.recordLength);
        var dataview = self.encodeRAW(self.downsample(bufferLeft, self.sampleRate, self.downsampleRate), true);
        var audioBlob = new Blob([dataview], { type: data.params.type });
        self.clear();
        global.postMessage({
            action: data.action,
            data: audioBlob
        });
    },
    mergeBuffers: function (recBuffers, recLength) {
        var result = new Float32Array(recLength);
        var offset = 0;

        for (var i = 0; i < recBuffers.length; i++) {
            result.set(recBuffers[i], offset);
            offset += recBuffers[i].length;
        }

        return result;
    },
    encodeRAW: function (samples) {
        var self = this;
        var buffer = new ArrayBuffer(samples.length * 2);
        var view = new DataView(buffer);
        self.floatTo16BitPCM(view, 0, samples);
        return view;
    },
    downsample: function (e, sampleRate, outputSampleRate) {
        if (sampleRate <= outputSampleRate) return e;

        var t = e.length;
        sampleRate += 0.0;
        outputSampleRate += 0.0;

        var s = 0,
            o = sampleRate / outputSampleRate,
            u = Math.ceil(t * outputSampleRate / sampleRate),
            a = new Float32Array(u);

        for (var i = 0; i < u; i++) {
            a[i] = e[Math.floor(s)];
            s += o;
        }
        return a;
    },
    floatTo16BitPCM: function (output, offset, input) {
        for (var i = 0; i < input.length; i++, offset += 2) {
            var s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    },
    clear: function () {
        var self = this;
        self.recordBuffersLeft = [];
        self.recordBuffersRight = [];
        self.recordLength = 0;
    },
    close: function () {
        this.clear();
        global.close();
    }
}