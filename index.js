// Setting

let bpm = 120;

let barLength = 2; // 一小節当たりの秒数
let beatLength = barLength / 4; // 一拍当たりの秒数

let timer = null;

// BPM を調節できるようにした
function updateBpm(newBpm) {
    bpm = newBpm;
    barLength = 4 * 60 / bpm;
    beatLength = barLength / 4;
}

function play() {
    // Play ボタンを押す度に演奏を初期化できるようにした
    if (timer) {
        clearInterval(timer);
    }

    const barGen = nextBar(0.5);

    // 1小節ごとに新たな note を生成
    timer = setInterval(() => {
        barGen.next();
    }, barLength * 1000);
}

function* nextBar(time) {
    const chordGen = nextChord();

    while (1) {
        const {root, type} = chordGen.next().value;

        // メロディ
        for (let j = 0; j < 4; ++j) {
            note(0, beatLength * j, randGet(chordNotes(root, type)) + 12, beatLength);
        }

        // コード
        chord(root, type, barLength);

        yield;
    }
}

function* nextChord() {
    const rootTable = {
        C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71
    };
    const chordProgs = [
        'Cmajor Eminor7 Fmajor G7',
        'Fmajor G7 Eminor7 Aminor',
        'Aminor Fmajor Gmajor Cmajor',
        'Fmajor Eminor7 Dminor7 Cmajor',
        'Cmajor Gmajor Aminor Eminor Fmajor Eminor Fmajor Gmajor',
    ].map(x => x.split(' ').map(y => {
        return {
            root: rootTable[y[0]],
            type: y.substr(1)
        };
    }));

    while (1) {
        yield* randGet(chordProgs);
    }
}

// 
function note(channel, offset, nn, dur) {
    // note on の登録
    setTimeout(() => {
        output.send([channel + 0x90, nn, 100]);
    }, offset * 1000);

    // note off の登録
    setTimeout(() => {
        output.send([channel + 0x90, nn, 0]);
    }, (offset + dur) * 1000 - 10);     // 次の on が off よりも先を越さないように -10
}

function chordNotes(root, type) {
    const ds = {
        'major':   [0, 4, 7],
        'minor':   [0, 3, 7],
        '7':       [0, 4, 7, 10],
        'minor7':  [0, 3, 7, 10],
    }[type];
    return ds.map((x) => x + root);
}

function chord(root, type, dur) {
    for (const nn of chordNotes(root, type))
        note(1, 0, nn, dur);
}

function randGet(arr) {
    return arr[Math.random() * arr.length | 0];
}


// Event Handling

function getSelectedOutput(selector) {
    const index = selector.selectedIndex;
    const portId = selector[index].value;
    return midiOutputs.get(portId);
};

const outputSelector = document.getElementById('output_selector');
const bpmField = document.getElementById('bpm_field');
const playButton = document.getElementById('play_button');

outputSelector.addEventListener('change', () => {
    output = getSelectedOutput(outputSelector);
});

bpmField.addEventListener('input', () => {
    updateBpm(Number.parseInt(bpmField.value));
})

playButton.addEventListener('click', () => {
    play();
});


// MIDI Access

let midiOutputs = [];
let output = null;

navigator.requestMIDIAccess()
    .then(midiAccess => {
        midiOutputs = midiAccess.outputs;
        for (const input of midiOutputs.values()) {
            const optionEl = document.createElement('option');
            optionEl.text = input.name;
            optionEl.value = input.id;
            outputSelector.add(optionEl);
        }
        output = getSelectedOutput(outputSelector);
    });
