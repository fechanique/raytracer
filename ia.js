class Voice{
    constructor(){
        this.listening = false
        this.canSend = false
        this.transcript = ''
        this.fullText = ''
        this.iaText = ''
        this.voice = null
    }

    async init(){
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)()
        this.recognition.lang = 'es-ES'
        //this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.onresult = (event) => {
            console.log('onresult')
            this.transcript = event.results[0][0].transcript;
            //console.log(event)
            //console.log(transcript)
            if(event.results[0].isFinal){ //parece que a veces no pasa por aquí y el mensaje no se enviar
                console.log('final')
                this.fullText += this.transcript + '. '
                setSubtitle(this.fullText + '\n')
            }else{
                setSubtitle(this.fullText + this.transcript)
            }
        }
        this.recognition.onerror = (event) => {
            console.log('onerror')
        }
        this.recognition.onstart = () => {
            console.log('onstart')
            this.listening = true
            this.transcript = ''
        }
        this.recognition.onend = () => {
            console.log('onend')
            this.listening = false
            let text = this.fullText || this.transcript
            if(this.canSend && text){
                setSubtitle(text + '\n')
                console.log('+', text)
                subtitles.style.background = 'rgba(0,100,0,0.5)'
                client.publish(pref+'/speak', JSON.stringify(text))
                this.fullText = ''
            }
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

        this.synth = window.speechSynthesis
        this.synth.onvoiceschanged = (event) => {
            console.log('synth onvoiceschanged')
            this.setVoice()
        }
        this.synth.onstart = (event) => {
            console.log('synth onstart')
        }
        this.synth.onend = (event) => {
            console.log('synth onend')
        }
    }

    listen(){
        if(this.listening) return
        this.synth.cancel()
        this.canSend = false
        this.recognition.start()
        clearSubtitle()
        subtitles.style.background = 'rgba(0,0,0,0.5)'
    }

    stopListen(){
        if(!this.listening) return
        this.canSend = true
        if(this.fullText) this.recognition.stop()
    }

    setVoice(){
        this.voices = this.synth.getVoices()
        for (let i = 0; i < this.voices.length; i++) {
            if (this.voices[i].name === 'Google español') {
                this.voice = this.voices[i];
            }
        }
    }

    speak(text){
        let msg = new SpeechSynthesisUtterance();
        msg.text = text
        msg.lang = "es-ES"
        if(this.voice) msg.voice = this.voice
        msg.rate = 1.3
        msg.pitch = 0.8

        console.log('-', text)
        addSubtitle('- ' + text + '\n')
        this.synth.speak(msg)
    }
}

voice = new Voice()
voice.init()

subtitlesTimeout = null
function setSubtitle(text){
    subtitles.innerText = text
    clearSubtitle()
}

function addSubtitle(text){
    subtitles.innerText += text
    subtitles.scrollTop = subtitles.scrollHeight
    clearSubtitle()
}

function clearSubtitle(){
    subtitles.style.display = 'block'
    if(subtitlesTimeout) clearTimeout(subtitlesTimeout)
    subtitlesTimeout = setTimeout(() => {
        if(voice.synth.speaking || voice.listening){
            clearSubtitle()
            return
        }
        subtitles.style.display = 'none'
        subtitles.innerText = ''
    }, 5000)
}