import edge_tts


async def generate_voice(text, output_audio):
    communicate = edge_tts.Communicate(text=text, voice="en-US-AriaNeural")

    await communicate.save(output_audio)
