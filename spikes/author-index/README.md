# Author bibliography spike

Run on September 30, 2026 (October 1 UTC). **Automatic retrieval works, but neither tested provider supplies a fully reliable, complete bibliography with an abstract for every paper.** The script is isolated from the app and does not change the LLM prompt.

## Best-effort unique output

For a compact LLM index, run `node scripts/author-index-context.ts` after generating the unique output. This fetches and caches OpenAlex citation counts, ranks the deduplicated papers, keeps the top 100 per author, and includes abstracts only for ranks 1–10. Ranks 11–100 omit the abstract field while retaining title, link, year, and citation count. When papers are omitted, the text ends with `+ N more`; the JSON records `omittedPapers`. The source bibliography keeps all abstracts. See [context-report.md](context-report.md) for the size comparison and top papers, `<author>.ranked.json` for the compact data, and `<author>.context.md` for ready-to-use context text. `--offline` reuses the saved citation counts and `--refresh` refreshes them. Merged versions use their maximum citation count, not the sum. Unknown citation counts sort last; missing top-10 abstracts do not promote lower-ranked papers.

The practical follow-up is [unique-report.md](unique-report.md): one deduplicated list of other papers per author, with available abstracts and links. Run `node scripts/author-index-unique.ts` to regenerate it from the saved results. It writes `unique-results.json` and `<author>.unique.json`. These are the useful context candidates; the original tables below describe raw provider behavior.

The reducer uses OpenAlex as its primary bibliography, merges versions through DOI/arXiv IDs and normalized titles, handles corroborated one-character title typos, removes obvious editorial/correction/supplement entries, and excludes the seed paper. It adds arXiv papers when a known coauthor corroborates the name and uses Semantic Scholar to enrich already accepted records. Uncorroborated candidates stay in a separate review list. The author website stays held out for evaluation. This is deliberately a best-effort index; a complete publisher-type audit and manual precision audit are not prerequisites for generating it.

## Results

Counts below are unique provider records, including the seed paper. Different preprint/journal versions, non-paper works, and mistaken attributions can inflate these counts. They are not counts of verified distinct papers. `with abstract / records` measures field availability, not correctness of the abstract.

| Author | OpenAlex: with abstract / records | Semantic Scholar: with abstract / records |
| --- | ---: | ---: |
| Ashish Vaswani | 54 / 61 | 27 / 53 |
| Niki Parmar | 25 / 28 | 20 / 75 |
| Łukasz Kaiser | 67 / 97 | 37 / 78 |
| Yoshua Bengio | 1,195 / 1,427 | Lookup failed: 404, then search 429 |
| Terence Tao | 648 / 946 | 301 / 506 |
| Heng Li | 439 / 549 | 65 / 80 |
| Richard A. Neher | 251 / 276 | 133 / 178 |

Every successfully retrieved provider record had a title and a link. Link reachability was not exhaustively checked. Both providers rejected the nonexistent-author control. All successful bibliography downloads reached the end of pagination; no configured page limit was hit.

### Specific failures

1. **Missing known papers.** Semantic Scholar's Kaiser author profile omits [Tensor2Tensor for Neural Machine Translation](https://arxiv.org/abs/1803.07416), although arXiv's author list includes him. Against 42 arXiv records with the matching author name, OpenAlex matched 39 and Semantic Scholar matched 33. OpenAlex's unmatched records were [GPT-4 Technical Report](https://arxiv.org/abs/2303.08774), [Training Verifiers to Solve Math Word Problems](https://arxiv.org/abs/2110.14168), and [Machine Learning with Guarantees using Descriptive Complexity and SMT Solvers](https://arxiv.org/abs/1609.02664). Matches use DOI, arXiv ID, or exact normalized title; a renamed work without a shared identifier can be an apparent miss.
2. **An independent bibliography is still not fully covered.** [Neher's own publication page](https://neherlab.org/richard-neher.html) contains 112 entries. OpenAlex matched 111; Semantic Scholar matched 108. OpenAlex did not match *Mathematical modeling of escape of HIV from cytotoxic T lymphocyte responses* (10.1088/1742-5468/2013/01/P01010). Semantic Scholar's unmatched entries include the 2026 Nextstrain preprint and papers from 2024–2026. This comparison measures coverage of that particular page, not every publication Neher has ever written.
3. **False authorships, not just missing data.** Semantic Scholar returned [a KITMUS record](https://www.semanticscholar.org/paper/4877c75b2b21bff24bcf2e3a27209d4a1fae3456) as one of Niki Parmar's papers. Its 69 listed authors include Niki, “Ltd Sons,” and “Robert Frank. 2019. Jabberwocky.” The [published paper's author list](https://aclanthology.org/2023.acl-long.841/) contains six people, none of them Niki. This looks like reference-list text misparsed as authorship. The preprint-to-published-paper pairing was reviewed manually; the script repeats the source-author-list check. Other suspicious records are preserved for review, not counted as proven false positives.
4. **Author-name variants break simple matching.** OpenAlex uses “Niki Jitendra Parmar,” while the seed's original byline is “Niki Parmar.” Reading `raw_author_name` fixes that case. Semantic Scholar uses “T. Tao” and “R. Neher”; matching those requires an explicitly flagged, compatible-name fallback on the seed paper. Initials alone are not identity proof. The script never merges arbitrary author profiles by surname or picks the first author-search result.
5. **Name searches are not reliable identity checks.** The arXiv Heng Li query returned 276 records, including work in several unrelated fields. Even an exact full-name match is only a candidate. These are deliberately not combined into his provider-derived context files.
6. **Missing and malformed abstracts.** OpenAlex had four malformed positional indexes across Bengio (2), Tao (1), and Li (1). The first strict attempt stopped those downloads. The final script retains the records, sets the unusable abstracts to null, records the defect, and finishes pagination. No abstracts are invented. Semantic Scholar abstract availability ranged from 27% for Parmar to 81% for Li in this suite.
7. **Duplicates and inconsistent totals.** OpenAlex's 946 Tao records contain 260 groups sharing an exactly normalized title. These are candidate duplicates, not automatically interchangeable editions. OpenAlex's Vaswani author profile reported 58 works while its works endpoint returned 61. Semantic Scholar reported 54 and returned 53 despite reaching the last page. Reported counts cannot certify completeness.
8. **Latency and availability.** Unauthenticated Semantic Scholar requests intermittently returned 429. Retries recovered several requests, but Bengio's seed lookup returned 404 and the fallback search exhausted its retry budget. OpenAlex's arXiv DOI lookups also failed for Attention Is All You Need and Minimap2; exact-title plus author matching recovered them. Keys may improve access reliability but cannot repair missing abstracts or incorrect authorship.

### Context size

Before deduplication or filtering, Bengio's OpenAlex other-paper index is about 1.49 million characters of title, abstract, link, and year. Using the app's existing 3.2 characters/token heuristic, that is approximately 466,000 tokens for one author. This is an estimate, not a tokenizer measurement. Unbounded context for every coauthor can be impractical even when retrieval succeeds.

## Reproduce

Run from the repository root with Node 24. No additional dependencies or API keys are required for the unauthenticated probe:

```sh
node scripts/author-index-spike.ts
node scripts/author-index-spike.ts --author 'Heng Li'
node scripts/author-index-spike.ts --offline
node scripts/author-index-spike.ts --refresh --out spikes/author-index-fresh
node --test scripts/author-index-spike.test.ts
```

`--suite path/to/suite.json` accepts a custom suite. Each case supplies the author name, aliases if known, a seed arXiv ID or DOI and title, and independent papers to check. The supplied suite covers seven real authors and a negative control. The optional website parser is specifically for the supplied Neher page. It is not a general website crawler.

Optional environment variables: `OPENALEX_API_KEY` and `SEMANTIC_SCHOLAR_API_KEY`. The script does not load `.env` or `.dev.vars`. API keys are excluded from saved URLs. Each source is rate-spaced; requests have a 25-second timeout and at most three attempts for transient failures. Pagination is bounded at 100 pages and reports whether it ended naturally. Long Retry-After instructions end the probe instead of being ignored.

Successful raw responses are reused by default. Errors are retried on a subsequent live run. `--offline` uses only saved responses, including saved failures. The report timestamp is the processing time; each raw response also records its original fetch time. A filtered run replaces `results.json` and `report.md` in its output directory with the selected case only, so use a separate `--out` to preserve a full-suite report.

## Artifacts

- [Script](../../scripts/author-index-spike.ts), [suite](../../scripts/author-index-suite.json), and [helper tests](../../scripts/author-index-spike.test.ts).
- [Generated report with actual abstract samples](report.md).
- `results.json`: complete normalized bibliographies, provider identities, pagination, field coverage, duplicate groups, holdout results, precision check, cross-provider missing lists, and request log.
- `<author>.context.json`: each provider's title/abstract/link/year candidate index, excluding the seed. Provider resolution and a warning are included. These files deliberately preserve the provider data for inspection; they are not production-ready prompts.
- `raw/*.json`: original API responses with URL, timestamp, HTTP status, and latency. File names are SHA-256 hashes of URLs without API keys.
- `initial-results.json` and `initial-report.md`: the first strict pass, preserved to show failures before handling original bylines, initials, and malformed abstracts. An initially proposed Parmar holdout was removed after the independent arXiv author check correctly showed she was not an author.

Large raw and JSON artifacts remain local and are ignored by Git. The script, suite, tests, this interpretation, and generated sample report remain reviewable repository files.

## Recommended product boundary

Use a cached, source-attributed index of **other papers we found**, with author IDs resolved from the current paper. Verify author bylines against primary-source metadata where possible, merge versions conservatively, backfill missing abstracts from arXiv/bioRxiv, and keep unresolved entries out of automatic context. Bound the injected context and retrieve additional papers when needed. A raw union of provider results would increase both recall and false attribution.

This suite disproves full reliability/completeness; it does not estimate global precision or recall. Most reference checks cover a few known papers, only one author has an independently maintained bibliography comparison, name-search results can contain other people, and not every result's abstract or authorship was manually verified.

Validation: nine focused helper tests, standalone TypeScript checking, and `yarn build` passed. The local main-flow regression check loaded the paper and figures, used highlight → Ask AI, received a streamed answer, and confirmed persistence after reload. The visual check also showed the existing display equation (1) partly clipped; no app files were changed by this spike.
