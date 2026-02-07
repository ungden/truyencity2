require('dotenv').config({path:'.env.local'});
const {createClient}=require('@supabase/supabase-js');
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze(novelId, novelTitle) {
  const {data:chapters,error}=await s.from('chapters').select('chapter_number,title,content')
    .eq('novel_id',novelId).lte('chapter_number',30).order('chapter_number');
  if(error) throw error;
  if(!chapters||chapters.length===0){ console.log('No chapters for '+novelTitle); return; }

  const output = [];

  for(const ch of chapters){
    const c = ch.content || '';
    const words = c.split(/\s+/).filter(w=>w.length>0).length;
    const chars = c.length;

    // Cliffhanger detection (last 500 chars)
    const tail = c.slice(-500).toLowerCase();
    const cliffPatterns = ['?!','!!!','...','liệu','chuyện gì','không ngờ','bất ngờ','đột nhiên','rốt cuộc','sẽ ra sao'];
    const cliffHits = cliffPatterns.filter(p => tail.includes(p));

    // Dialogue ratio
    const lines = c.split('\n').filter(l=>l.trim().length>0);
    const dialogueLines = lines.filter(l => /^\s*[-—–]|^\s*[""]/.test(l));
    const dialogueRatio = lines.length > 0 ? Math.round(dialogueLines.length / lines.length * 100) : 0;

    // Action keywords
    const actionWords = ['chiến đấu','tấn công','kiếm','quyền','đánh','giết','phá','nổ','máu','chém','đấm','bắn'];
    const actionCount = actionWords.reduce((sum,w) => sum + (c.toLowerCase().split(w).length - 1), 0);

    // Emotion keywords
    const emotionWords = ['tức giận','phẫn nộ','đau đớn','vui mừng','kinh hãi','sợ hãi','hận','yêu','thương','khóc','cười','run rẩy','nghẹn ngào'];
    const emotionCount = emotionWords.reduce((sum,w) => sum + (c.toLowerCase().split(w).length - 1), 0);

    // Scene breaks (double newlines or ***)
    const sceneBreaks = (c.match(/\n\s*\n|\*\*\*/g) || []).length;

    // First 200 chars (hook quality)
    const hook = c.substring(0, 200).replace(/\n/g, ' ').trim();

    // Last 200 chars (ending quality)
    const ending = c.slice(-200).replace(/\n/g, ' ').trim();

    const isGenericTitle = /^Chương\s+\d+$/i.test((ch.title||'').trim());

    output.push({
      n: ch.chapter_number,
      title: (ch.title||'').substring(0,55),
      words,
      chars,
      dialogueRatio,
      actionCount,
      emotionCount,
      sceneBreaks,
      cliffHits: cliffHits.length,
      genericTitle: isGenericTitle,
      hook: hook.substring(0,100),
      ending: ending.substring(0,100)
    });
  }

  // Summary
  const totalWords = output.reduce((s,o)=>s+o.words,0);
  const avgWords = Math.round(totalWords/output.length);
  const minO = output.reduce((a,b)=>a.words<b.words?a:b);
  const maxO = output.reduce((a,b)=>a.words>b.words?a:b);
  const avgDialogue = Math.round(output.reduce((s,o)=>s+o.dialogueRatio,0)/output.length);
  const avgAction = Math.round(output.reduce((s,o)=>s+o.actionCount,0)/output.length);
  const avgEmotion = Math.round(output.reduce((s,o)=>s+o.emotionCount,0)/output.length);
  const avgScenes = (output.reduce((s,o)=>s+o.sceneBreaks,0)/output.length).toFixed(1);
  const cliffCount = output.filter(o=>o.cliffHits>0).length;
  const genericCount = output.filter(o=>o.genericTitle).length;

  // Word count consistency (stddev)
  const mean = avgWords;
  const variance = output.reduce((s,o)=>s+Math.pow(o.words-mean,2),0)/output.length;
  const stddev = Math.round(Math.sqrt(variance));

  // Title uniqueness
  const titleSet = new Set(output.map(o=>o.title));
  const uniqueTitles = titleSet.size;

  console.log('\n========================================');
  console.log('  ' + novelTitle);
  console.log('========================================\n');

  console.log('OVERVIEW');
  console.log('  Chapters: ' + output.length + '/30');
  console.log('  Total words: ' + totalWords.toLocaleString());
  console.log('  Avg words/ch: ' + avgWords + ' (stddev: ' + stddev + ')');
  console.log('  Shortest: ch' + minO.n + ' (' + minO.words + 'w) | Longest: ch' + maxO.n + ' (' + maxO.words + 'w)');
  console.log('');

  console.log('TITLES');
  console.log('  Descriptive: ' + (output.length - genericCount) + '/' + output.length);
  console.log('  Generic "Chương N": ' + genericCount + '/' + output.length + ' (' + Math.round(genericCount/output.length*100) + '%)');
  console.log('  Unique titles: ' + uniqueTitles + '/' + output.length);
  console.log('');

  console.log('ENGAGEMENT');
  console.log('  Cliffhangers: ' + cliffCount + '/' + output.length + ' (' + Math.round(cliffCount/output.length*100) + '%)');
  console.log('  Avg dialogue: ' + avgDialogue + '%');
  console.log('  Avg action density: ' + avgAction + ' keywords/ch');
  console.log('  Avg emotion density: ' + avgEmotion + ' keywords/ch');
  console.log('  Avg scene breaks: ' + avgScenes + '/ch');
  console.log('');

  console.log('PER-CHAPTER');
  console.log(' Ch | Words | Dial% | Act | Emo | Scenes | Cliff | Title');
  console.log('----|-------|-------|-----|-----|--------|-------|------');
  for(const o of output){
    const cliff = o.cliffHits > 0 ? ' YES ' : '     ';
    console.log(
      String(o.n).padStart(3) + ' |' +
      String(o.words).padStart(6) + ' |' +
      String(o.dialogueRatio).padStart(5) + '% |' +
      String(o.actionCount).padStart(4) + ' |' +
      String(o.emotionCount).padStart(4) + ' |' +
      String(o.sceneBreaks).padStart(7) + ' |' + cliff + ' | ' +
      o.title
    );
  }

  // Sample hooks and endings
  console.log('\nSAMPLE HOOKS (first 100 chars)');
  for(const o of [output[0], output[4], output[14], output[output.length-1]]){
    if(!o) continue;
    console.log('  Ch' + o.n + ': "' + o.hook + '..."');
  }

  console.log('\nSAMPLE ENDINGS (last 100 chars)');
  for(const o of [output[0], output[9], output[19], output[output.length-1]]){
    if(!o) continue;
    console.log('  Ch' + o.n + ': "...' + o.ending + '"');
  }

  // Character name consistency check
  const allText = chapters.map(c=>c.content||'').join(' ');
  const namePattern = /Hàn Mặc|hàn mặc/gi;
  const mcMentions = (allText.match(namePattern)||[]).length;
  console.log('\nCHARACTER CONSISTENCY');
  console.log('  MC "Hàn Mặc" mentions: ' + mcMentions + ' across ' + output.length + ' chapters (' + Math.round(mcMentions/output.length) + '/ch avg)');

  // Check for MC name appearing in every chapter
  const chWithMC = chapters.filter(c=>/Hàn Mặc/i.test(c.content||'')).length;
  console.log('  Chapters with MC: ' + chWithMC + '/' + output.length);
}

(async()=>{
  // Novel: Ảnh Đế Trùng Sinh
  await analyze('40906e14-f71b-4bd7-95c8-7590bd32dcd8', 'Ảnh Đế Trùng Sinh (đô thị)');

  // Also compare with old novel
  await analyze('6fbe01c3-c623-4cd4-99ca-713ccefb3a1e', 'Trùng Sinh: Ta Là Boss Cuối (pre-fix, tiên hiệp)');

  process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});
