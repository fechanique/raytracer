class Voice{
    constructor(){
        this.audioChunks = []
        this.listening = false
    }

    async init(){
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.mediaRecorder = new MediaRecorder(this.stream)

        this.audioContext = new AudioContext();
        this.microphone = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.microphone.connect(this.analyser);
        this.analyser.fftSize = 2048;
        //this.analyser.minDecibels = -65;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.mediaRecorder.ondataavailable = event => {
            console.log('ondataavailable')
            this.audioChunks.push(event.data)
        }
        this.mediaRecorder.onstop = () => {
            console.log('onstop')
            const audioBlob = new Blob(this.audioChunks, {type: 'audio/mpeg-3'})
            const audioUrl = URL.createObjectURL(audioBlob)
            const downloadLink = document.createElement("a")
            downloadLink.href = audioUrl
            downloadLink.download = "audio.mp3"
            downloadLink.click()
        }
    }

    listen(){
        if(this.listening) return
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)()
        this.recognition.lang = 'es-ES'
        //this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.onresult = (event) => {
            console.log('onresult')
            const transcript = event.results[0][0].transcript;
            console.log(event)
            console.log(transcript)
            if(event.results[0].isFinal) client.publish(pref+'/speak', JSON.stringify(transcript))
        }
        this.recognition.onerror = (event) => {
            console.log('onerror')
        }
        this.recognition.onstart = () => {
            console.log('onstart')
            this.listening = true
        }
        this.recognition.onend = () => {
            console.log('onend')
            this.listening = false
        }
        this.recognition.onsoundstart= (event) => {
            console.log('soundstart')
        }
        this.recognition.onsoundend = (event) => {
            console.log('soundend')
        }
        this.recognition.audiostart = (event) => {   
            console.log('audiostart')
        }
        this.recognition.audioend = (event) => {
            console.log('audioend')
        }
        this.recognition.sppechstart = (event) => {
            console.log('speechstart')
        }
        this.recognition.speechend = (event) => {
            console.log('speechend')
        }
        this.recognition.start()
    }

    stopListen(){
        //console.log('stopListen', this.text)
        //if(this.text) client.publish(pref+'/speak', JSON.stringify(this.text))
    }

    record(){
        this.audioChunks = []
        this.mediaRecorder.start()
        this.detectSilence()
    }

    stop(){
        this.mediaRecorder.stop()
        if(this.interval) clearInterval(this.interval)
    }

    detectSilence() {
        const silenceThreshold = 128; // Adjust this value based on your sensitivity needs
        const intervalTime = 100; // Check every 100 ms

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
        recognition.lang = 'es-ES'
        //recognition.interimResults = true;
        //recognition.continuous = true;
        recognition.onresult = (event) => {
            console.log('onresult')
            const transcript = event.results[0][0].transcript;
            console.log(transcript)
            client.publish(pref+'/speak', JSON.stringify(transcript))
        }
        recognition.onsoundstart= (event) => {
            console.log('soundstart')
        }
        recognition.onsoundend = (event) => {
            console.log('soundend')
        }
        recognition.audiostart = (event) => {   
            console.log('audiostart')
        }
        recognition.audioend = (event) => {
            console.log('audioend')
        }
        recognition.sppechstart = (event) => {
            console.log('speechstart')
        }
        recognition.speechend = (event) => {
            console.log('speechend')
        }
        recognition.start();

        this.speaking = false
    
        this.interval = setInterval(() => {
            this.analyser.getByteTimeDomainData(this.dataArray)
    
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                let value = this.dataArray[i] - 128
                sum += value * value;
            }
            let average = sum / this.dataArray.length;
            if(average<1){
                if(this.speaking && !this.timeout) this.timeout = setTimeout(() => {
                    this.speaking = false
                    console.log('send audio')
                    //recognition.stop()
                }, 5000);
            }else{
                if(this.timeout){
                    clearTimeout(this.timeout)
                    this.timeout = null
                }
                if(!this.speaking){
                    console.log('start to speak')
                    this.speaking = true
                }
            }
        }, intervalTime);
    }
}

voice = new Voice()
voice.init()

const synth = window.speechSynthesis
const voices = synth.getVoices()
ia_voice = null
for (let i = 0; i < voices.length; i++) {
    if (voices[i].name === 'Google español') {
        ia_voice = voices[i];
    }
}