import locales from './locales/locales';
export default {
    'google_cloud':{
        'name':'Google Translate',
        'minLevel':0,
        'cpp':1,
        'isRealtime':true,
    },
    'deepl':{
        'name':'DeepL',
        'minLevel':0,
        'cpp':1,
        'isRealtime':true,
    },
    'auto':{
        'name':Object.fromEntries(Object.entries(locales).map(([k,v])=>[k,v.selectAutomatically])),
        'minLevel':0,
        'cpp':1,
        'isRealtime':false,
    },
    'deepseekv31':{
        'name':'DeepSeek-V3.1',
        'minLevel':1,
        'cpp':1,
        'isRealtime':false,
    },
    'gpt5_mini':{
        'name':'GPT-5 mini',
        'minLevel':1,
        'cpp':3,
        'isRealtime':false,
    },
    'claude45_sonnet':{
        'name':'Claude Sonnet 4.5',
        'minLevel':2,
        'cpp':10,
        'isRealtime':false,
    },
    'gpt5':{
        'name':'GPT-5',
        'minLevel':3,
        'cpp':20,
        'isRealtime':false,
    },
}

