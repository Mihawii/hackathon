export const offlineReadings = {
    gold: {
        audio: new URL('./gold.wav', import.meta.url).href,
        cues: [
            { start: 0.31, end: 3.87, text: 'That little boat was a tram ticket before you got hold of it.' },
            { start: 4.95, end: 7.65, text: 'I remember a blue smudge on your thumb.' },
            { start: 8.89, end: 13.215, text: 'By the time the paper softened, the far bank had gone gold.' },
            { start: 14.735, end: 18.39, text: 'All these years later, I can still make the fold.' },
            { start: 19.61, end: 21.895, text: 'My hands remember you that way.' }
        ]
    },
    rain: {
        audio: new URL('./rain.wav', import.meta.url).href,
        cues: [
            { start: 0.31, end: 2.255, text: 'We missed the bus that evening.' },
            { start: 3.295, end: 6.21, text: 'You drew a little house in the steam on the glass.' },
            { start: 7.19, end: 11.475, text: 'I gave it a crooked chimney, and you put a curl of smoke above it.' },
            { start: 12.995, end: 15.48, text: "I've forgotten where we were going." },
            { start: 16.62, end: 19.47, text: 'I remember which way the chimney leaned.' }
        ]
    },
    bloom: {
        audio: new URL('./bloom.wav', import.meta.url).href,
        cues: [
            { start: 0.31, end: 3.875, text: 'On that hill you taught me a tune with only four notes.' },
            { start: 4.915, end: 10, text: 'A bee kept landing on the same red poppy, and the third note kept escaping me.' },
            { start: 11.32, end: 15.31, text: 'Yesterday, in the kitchen, I found myself humming it.' },
            { start: 16.45, end: 18.625, text: 'I got the third note wrong again.' },
            { start: 19.785, end: 22.785, text: 'For a moment, there you were, laughing.' }
        ]
    },
    memory: {
        audio: new URL('./memory.wav', import.meta.url).href,
        cues: [
            { start: 0.31, end: 2.64, text: 'A photograph used to trouble me.' },
            { start: 3.74, end: 9.015, text: 'Here was one second I could hold in my hand, and all the hours around it gone.' },
            { start: 10.535, end: 12.955, text: 'These days I look at the edges.' },
            { start: 14.115, end: 18.335, text: 'Just beyond them are the voices, the waiting, the journey home.' },
            { start: 19.715, end: 24.775, text: 'The older I get, the more of a picture I find outside the frame.' }
        ]
    }
};
