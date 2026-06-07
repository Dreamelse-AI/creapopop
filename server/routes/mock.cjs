const { sendJson } = require('../utils/body.cjs');

// Mock 音色库
const VOICES = [
    { id: 'v_male_1', name: '低沉磁性', gender: 'male', previewUrl: '' },
    { id: 'v_male_2', name: '阳光少年', gender: 'male', previewUrl: '' },
    { id: 'v_female_1', name: '温柔御姐', gender: 'female', previewUrl: '' },
    { id: 'v_female_2', name: '元气少女', gender: 'female', previewUrl: '' },
    { id: 'v_neutral_1', name: '中性清冷', gender: 'unknown', previewUrl: '' },
];

// Mock 音乐库
const MUSIC = [
    { id: 'm_1', name: '夏日午后', tags: ['轻快', '治愈'], previewUrl: '' },
    { id: 'm_2', name: '雨夜独白', tags: ['伤感', '钢琴'], previewUrl: '' },
    { id: 'm_3', name: '热血燃情', tags: ['激昂', '战斗'], previewUrl: '' },
    { id: 'm_4', name: '星空漫步', tags: ['梦幻', '电子'], previewUrl: '' },
];

function handleVoices(_req, res) {
    sendJson(res, 200, { success: true, voices: VOICES });
}

function handleMusic(_req, res) {
    sendJson(res, 200, { success: true, music: MUSIC });
}

module.exports = { handleVoices, handleMusic };
