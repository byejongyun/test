const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// 각 키가 주로 샵(#)을 쓰는지, 플랫(b)을 쓰는지 정의 (0=C, 1=Db/C#, 2=D ...)
// 일반적으로 많이 쓰이는 표기법 기준
const KEY_PREFERENCES = [
    'none',  // 0: C
    'flat',  // 1: Db (C#보다 흔함)
    'sharp', // 2: D
    'flat',  // 3: Eb
    'sharp', // 4: E
    'flat',  // 5: F
    'sharp', // 6: F# / Gb (F# 선호)
    'sharp', // 7: G
    'flat',  // 8: Ab
    'sharp', // 9: A
    'flat',  // 10: Bb
    'sharp'  // 11: B
];

// 음표 문자열을 인덱스(0~11)로 변환
function getNoteIndex(noteStr) {
    let index = NOTE_NAMES_SHARP.indexOf(noteStr);
    if (index === -1) {
        index = NOTE_NAMES_FLAT.indexOf(noteStr);
    }
    return index; // 찾지 못하면 -1 반환
}

// 주어진 인덱스와 키 선호도에 따라 음표 문자열 반환
function getNoteString(index, targetKeyIndex) {
    // 음수가 나오지 않도록 처리
    const normalizedIndex = (index % 12 + 12) % 12;
    const pref = KEY_PREFERENCES[targetKeyIndex];
    
    if (pref === 'flat') {
        return NOTE_NAMES_FLAT[normalizedIndex];
    } else {
        return NOTE_NAMES_SHARP[normalizedIndex];
    }
}

// 단일 코드 변환 로직
function transposeChord(chord, interval, targetKeyIndex) {
    if (!chord || chord.trim() === '') return '';
    
    // 코드 파싱 정규식 (예: Cmaj7/G -> Root: C, Quality: maj7, Bass: G)
    // ([A-G][b#]?) : 루트 음 (A~G에 b이나 #이 붙을 수 있음)
    // (.*?) : 코드 성질 및 텐션 (maj7, m7b5 등)
    // (?:\/([A-G][b#]?))? : 베이스 음 (슬래시 뒤의 음, 생략 가능)
    const regex = /^([A-G][b#]?)(.*?)(?:\/([A-G][b#]?))?$/;
    
    const parts = chord.trim().split(/\s+/); // 한 마디 안에 여러 코드가 있을 수 있으므로 공백 분리
    
    const transposedParts = parts.map(part => {
        const match = part.match(regex);
        if (!match) return part; // 정규식에 안 맞으면(예: N.C. 등) 그대로 반환
        
        const rootNote = match[1];
        const quality = match[2];
        const bassNote = match[3];
        
        const rootIndex = getNoteIndex(rootNote);
        if (rootIndex === -1) return part;
        
        const newRootIndex = rootIndex + interval;
        const newRoot = getNoteString(newRootIndex, targetKeyIndex);
        
        let result = newRoot + quality;
        
        if (bassNote) {
            const bassIndex = getNoteIndex(bassNote);
            if (bassIndex !== -1) {
                const newBassIndex = bassIndex + interval;
                const newBass = getNoteString(newBassIndex, targetKeyIndex);
                result += '/' + newBass;
            } else {
                result += '/' + bassNote;
            }
        }
        
        return result;
    });
    
    return transposedParts.join(' ');
}


// DOM Elements
const inputGrid = document.getElementById('input-grid');
const outputGrid = document.getElementById('output-grid');
const addMeasuresBtn = document.getElementById('add-measures-btn');
const clearBtn = document.getElementById('clear-btn');
const transposeBtn = document.getElementById('transpose-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const originalKeySelect = document.getElementById('original-key');
const targetKeySelect = document.getElementById('target-key');
const songTitleInput = document.getElementById('song-title');
const sheetMusicTitle = document.getElementById('sheet-music-title');
const sheetMusicContainer = document.getElementById('sheet-music-container');

let measureCount = 0;

// 입력 마디 생성
function createInputMeasure() {
    measureCount++;
    const measureDiv = document.createElement('div');
    measureDiv.className = 'measure';
    
    const label = document.createElement('span');
    label.className = 'measure-number';
    label.innerText = measureCount;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'measure-input';
    input.placeholder = '코드...';
    input.dataset.measure = measureCount;
    
    const lyricsInput = document.createElement('input');
    lyricsInput.type = 'text';
    lyricsInput.className = 'measure-lyrics-input';
    lyricsInput.placeholder = '가사...';
    lyricsInput.tabIndex = -1; // Tab 키를 누를 때 이 입력 칸은 건너뜁니다.
    
    measureDiv.appendChild(label);
    measureDiv.appendChild(input);
    measureDiv.appendChild(lyricsInput);
    inputGrid.appendChild(measureDiv);
}

// 초기화 시 8마디 기본 생성
function initMeasures(count = 8) {
    inputGrid.innerHTML = '';
    measureCount = 0;
    for (let i = 0; i < count; i++) {
        createInputMeasure();
    }
}

// 이벤트 리스너: 마디 추가
addMeasuresBtn.addEventListener('click', () => {
    // 4마디 단위 추가
    for (let i = 0; i < 4; i++) {
        createInputMeasure();
    }
});

// 이벤트 리스너: 초기화
clearBtn.addEventListener('click', () => {
    if (confirm('입력한 코드를 모두 지우시겠습니까?')) {
        initMeasures();
        outputGrid.innerHTML = '<div class="empty-state">결과가 여기에 표시됩니다.</div>';
    }
});

// 이벤트 리스너: 조옮김 실행
transposeBtn.addEventListener('click', () => {
    const originalKey = parseInt(originalKeySelect.value);
    const targetKey = parseInt(targetKeySelect.value);
    
    // 제목 반영
    sheetMusicTitle.innerText = songTitleInput.value;

    const interval = targetKey - originalKey;
    
    const inputs = document.querySelectorAll('.measure-input');
    outputGrid.innerHTML = ''; // 기존 결과 지우기
    
    let hasInput = false;
    
    inputs.forEach((input, index) => {
        const chordValue = input.value.trim();
        const lyricsInput = input.nextElementSibling;
        const lyricsValue = lyricsInput ? lyricsInput.value.trim() : '';

        if (chordValue || lyricsValue) hasInput = true;
        
        const transposedValue = chordValue ? transposeChord(chordValue, interval, targetKey) : '';
        
        const measureBox = document.createElement('div');
        measureBox.className = 'measure-box measure';
        
        const label = document.createElement('span');
        label.className = 'measure-number';
        label.innerText = index + 1;
        
        const content = document.createElement('div');
        content.className = 'output-chord';
        content.innerText = transposedValue;
        
        measureBox.appendChild(label);
        measureBox.appendChild(content);

        if (lyricsValue) {
            const lyricsDiv = document.createElement('div');
            lyricsDiv.className = 'output-lyrics';
            lyricsDiv.innerText = lyricsValue;
            measureBox.appendChild(lyricsDiv);
        }

        outputGrid.appendChild(measureBox);
    });
    
    if (!hasInput) {
        outputGrid.innerHTML = '<div class="empty-state">코드를 먼저 입력해주세요.</div>';
    } else {
        // 부드러운 스크롤 애니메이션
        document.getElementById('output-panel').scrollIntoView({ behavior: 'smooth' });
    }
});

// 이벤트 리스너: PDF 저장
exportPdfBtn.addEventListener('click', () => {
    const title = songTitleInput.value || 'transpose_sheet';
    
    const opt = {
        margin:       1,
        filename:     `${title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // A4 컨테이너의 box-shadow 제거 등 임시 스타일 변경 (PDF 저장 시 깔끔하게 나오도록)
    const originalBoxShadow = sheetMusicContainer.style.boxShadow;
    sheetMusicContainer.style.boxShadow = 'none';

    html2pdf().set(opt).from(sheetMusicContainer).save().then(() => {
        // 원래 스타일로 복구
        sheetMusicContainer.style.boxShadow = originalBoxShadow;
    });
});

// 앱 시작
window.addEventListener('DOMContentLoaded', () => {
    initMeasures();
});
