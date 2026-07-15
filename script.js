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

// 조표 위치 정의 (상대적 top 위치 값, 0px이 첫째 줄, 40px이 맨 아랫 줄)
const SHARP_POS = [0, 15, -5, 10, 25, 5, 20];
const FLAT_POS = [20, 5, 25, 10, 30, 15, 35];

// Target Key Index별 조표 타입 및 개수
const KEY_SIGNATURES = {
    0: { type: 'none', count: 0 },
    1: { type: 'flat', count: 5 }, // Db
    2: { type: 'sharp', count: 2 }, // D
    3: { type: 'flat', count: 3 }, // Eb
    4: { type: 'sharp', count: 4 }, // E
    5: { type: 'flat', count: 1 }, // F
    6: { type: 'sharp', count: 6 }, // F#
    7: { type: 'sharp', count: 1 }, // G
    8: { type: 'flat', count: 4 }, // Ab
    9: { type: 'sharp', count: 3 }, // A
    10: { type: 'flat', count: 2 }, // Bb
    11: { type: 'sharp', count: 5 } // B
};

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

    // 입력된 데이터를 배열로 수집
    const measuresData = [];
    inputs.forEach((input, index) => {
        const chordValue = input.value.trim();
        const lyricsInput = input.nextElementSibling;
        const lyricsValue = lyricsInput ? lyricsInput.value.trim() : '';

        if (chordValue || lyricsValue) hasInput = true;
        
        const transposedValue = chordValue ? transposeChord(chordValue, interval, targetKey) : '';
        measuresData.push({ chord: transposedValue, lyrics: lyricsValue, num: index + 1 });
    });

    if (!hasInput) {
        outputGrid.innerHTML = '<div class="empty-state">코드를 먼저 입력해주세요.</div>';
        return;
    }

    // 4마디씩 묶어서 staff-row 생성
    for (let rowStart = 0; rowStart < measuresData.length; rowStart += 4) {
        const rowMeasures = measuresData.slice(rowStart, rowStart + 4);
        
        const staffRow = document.createElement('div');
        staffRow.className = 'staff-row';

        // 1) 코드 행
        const chordRow = document.createElement('div');
        chordRow.className = 'chord-row';
        rowMeasures.forEach(m => {
            const cell = document.createElement('div');
            cell.className = 'chord-cell';
            cell.innerText = m.chord || '\u00A0';
            chordRow.appendChild(cell);
        });
        // 4마디 미만인 경우 빈 셀 채우기
        for (let i = rowMeasures.length; i < 4; i++) {
            const cell = document.createElement('div');
            cell.className = 'chord-cell';
            cell.innerText = '\u00A0';
            chordRow.appendChild(cell);
        }

        // 2) 오선지 영역
        const staffArea = document.createElement('div');
        staffArea.className = 'staff-area';

        // 오선 5줄 (연속)
        const staffLinesBg = document.createElement('div');
        staffLinesBg.className = 'staff-lines-bg';
        for (let i = 0; i < 5; i++) {
            const sLine = document.createElement('div');
            sLine.className = 's-line';
            staffLinesBg.appendChild(sLine);
        }
        staffArea.appendChild(staffLinesBg);

        // 마디 구분선 (세로 바라인)
        const barlineOverlay = document.createElement('div');
        barlineOverlay.className = 'barline-overlay';

        // 맨 왼쪽 굵은 바
        const leftBar = document.createElement('div');
        leftBar.className = 'barline barline-thick';
        leftBar.style.left = '0';
        barlineOverlay.appendChild(leftBar);

        // 마디 구분선 (25%, 50%, 75%)
        for (let i = 1; i < 4; i++) {
            if (rowStart + i < measuresData.length) {
                const bar = document.createElement('div');
                bar.className = 'barline';
                bar.style.left = (i * 25) + '%';
                barlineOverlay.appendChild(bar);
            }
        }

        // 맨 오른쪽 굵은 바
        const rightBar = document.createElement('div');
        rightBar.className = 'barline barline-thick';
        rightBar.style.right = '0';
        barlineOverlay.appendChild(rightBar);

        staffArea.appendChild(barlineOverlay);

        // 높은음자리표 (각 줄의 첫 마디에만)
        const clef = document.createElement('div');
        clef.className = 'clef';
        clef.innerHTML = '&#119070;';
        staffArea.appendChild(clef);

        // 조표
        const keySig = document.createElement('div');
        keySig.className = 'key-sig';
        const sigInfo = KEY_SIGNATURES[targetKey];
        if (sigInfo.type !== 'none') {
            const positions = sigInfo.type === 'sharp' ? SHARP_POS : FLAT_POS;
            const symbolChar = sigInfo.type === 'sharp' ? '♯' : '♭';
            for (let i = 0; i < sigInfo.count; i++) {
                const sym = document.createElement('span');
                sym.className = 'key-symbol';
                sym.innerText = symbolChar;
                sym.style.top = positions[i] + 'px';
                sym.style.left = (i * 10) + 'px';
                keySig.appendChild(sym);
            }
        }
        staffArea.appendChild(keySig);

        // 3) 가사 행
        const lyricsRow = document.createElement('div');
        lyricsRow.className = 'lyrics-row';
        rowMeasures.forEach(m => {
            const cell = document.createElement('div');
            cell.className = 'lyrics-cell';
            cell.innerText = m.lyrics || '\u00A0';
            lyricsRow.appendChild(cell);
        });
        for (let i = rowMeasures.length; i < 4; i++) {
            const cell = document.createElement('div');
            cell.className = 'lyrics-cell';
            cell.innerText = '\u00A0';
            lyricsRow.appendChild(cell);
        }

        // 마디 번호
        rowMeasures.forEach((m, idx) => {
            const numSpan = document.createElement('span');
            numSpan.className = 'output-measure-num';
            numSpan.innerText = m.num;
            numSpan.style.left = (idx * 25) + '%';
            staffRow.appendChild(numSpan);
        });

        staffRow.appendChild(chordRow);
        staffRow.appendChild(staffArea);
        staffRow.appendChild(lyricsRow);
        outputGrid.appendChild(staffRow);
    }

    // 부드러운 스크롤 애니메이션
    document.getElementById('output-panel').scrollIntoView({ behavior: 'smooth' });
});

// 이벤트 리스너: PDF 저장
exportPdfBtn.addEventListener('click', () => {
    const title = songTitleInput.value || 'transpose_sheet';
    
    // PDF 저장 시 A4 꽉 채우기 대신 내용만큼만 캡쳐 (위에서부터 채움)
    const originalMinHeight = sheetMusicContainer.style.minHeight;
    const originalBoxShadow = sheetMusicContainer.style.boxShadow;
    sheetMusicContainer.style.minHeight = 'auto';
    sheetMusicContainer.style.boxShadow = 'none';

    const opt = {
        margin:       10,
        filename:     `${title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(sheetMusicContainer).save().then(() => {
        sheetMusicContainer.style.minHeight = originalMinHeight;
        sheetMusicContainer.style.boxShadow = originalBoxShadow;
    });
});

// 앱 시작
window.addEventListener('DOMContentLoaded', () => {
    initMeasures();
});

