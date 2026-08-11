import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN = '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';
const REPO = 'cursoryousef-cyber/Miran';

async function main() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=5`, {
    headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'Node-Script' },
  });
  const data: any = await res.json();
  const runs = data.workflow_runs ?? [];

  for (const r of runs) {
    console.log(`\n========================================`);
    console.log(`Workflow: "${r.name}" | Status: ${r.status} | Conclusion: ${r.conclusion}`);
    console.log(`Run ID: ${r.id} | Commit: ${r.head_sha.slice(0, 7)} - "${r.head_commit?.message}"`);

    const jobsRes = await fetch(r.jobs_url, {
      headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'Node-Script' },
    });
    const jobsData: any = await jobsRes.json();

    for (const j of jobsData.jobs ?? []) {
      console.log(`  Job: "${j.name}" -> ${j.status} [${j.conclusion}]`);
      for (const s of j.steps ?? []) {
        const icon = s.conclusion === 'success' ? '✅' : s.conclusion === 'failure' ? '❌' : s.status === 'in_progress' ? '⏳' : '⚪';
        console.log(`    ${icon} ${s.name} (${s.status} / ${s.conclusion})`);
      }
    }
  }
}

main().catch(console.error);
