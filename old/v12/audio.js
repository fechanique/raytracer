class Audio{
    constructor(){
        this.audioContext = new AudioContext()
        this.listener = this.audioContext.listener
        this.listener.positionX.value = player.posx
        this.listener.positionY.value = player.jump
        this.listener.positionZ.value = player.posx
    }
    async load(url, x, y, z, dist, loop, gain, factor){
        const audioBuffer = await fetch(url)
            .then(res => res.arrayBuffer())
            .then(ArrayBuffer => this.audioContext.decodeAudioData(ArrayBuffer))
        let source = this.audioContext.createBufferSource()
        let gainNode = this.audioContext .createGain()
        gainNode.gain.value = gain?gain:1
        gainNode.connect(this.audioContext.destination)
        source.buffer = audioBuffer
        let panner = new PannerNode(this.audioContext)
        panner.positionX.value = y?y:player.posy
        panner.positionY.value = z?z:player.jump
        panner.positionZ.value = x?x:player.posx
        //panner.panningModel = 'HRTF'
        panner.distanceModel = 'linear'
        panner.refDistance = 0
        panner.maxDistance = 1000
        panner.rolloffFactor = 1
        source.panner = panner
        source.loop = loop?loop:false

        source.connect(source.panner).connect(this.audioContext.destination)
        source.start()
        return this.source
    }
    setPlayer(player){
        this.listener.positionX.value = player.posy
        this.listener.positionY.value = player.jump
        this.listener.positionZ.value = player.posx
        this.listener.forwardX.value = Math.sin(player.rot*Math.PI/180)
        this.listener.forwardZ.value = -Math.cos(player.rot*Math.PI/180)
    }
}

sounds = [
    {id:'elevator', x:-800, y:600, z:0, dist:500, src:'sounds/machine2.mp3', playing:false, loop:true},
]