from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu")


def speech_to_text(audio_path):
    segments, info = model.transcribe(audio_path)

    text = ""

    for segment in segments:
        if segment.no_speech_prob < 0.5:
            text += segment.text

    return text
