from faster_whisper import WhisperModel

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = WhisperModel("base", device="cpu")
    return _model


def speech_to_text(audio_path):
    model = _get_model()
    segments, _info = model.transcribe(audio_path)

    text = ""

    for segment in segments:
        if segment.no_speech_prob < 0.5:
            text += segment.text

    return text
