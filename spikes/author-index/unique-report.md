# Best-effort unique author papers

Source snapshot: 2026-10-01T01:07:39.545Z. This reduction uses the saved provider responses without new network requests.

| Author | Unique other papers | With abstract | Eligible primary records before merging |
| --- | ---: | ---: | ---: |
| Ashish Vaswani | 53 | 48 | 60 |
| Niki Parmar | 22 | 20 | 27 |
| Łukasz Kaiser | 83 | 61 | 97 |
| Yoshua Bengio | 1085 | 963 | 1426 |
| Terence Tao | 618 | 430 | 942 |
| Heng Li | 468 | 388 | 543 |
| Richard A. Neher | 198 | 183 | 274 |
| Nonexistent Test Author Zqxv | 0 | 0 | 0 |

OpenAlex is the primary bibliography. arXiv contributes papers when a known coauthor corroborates the target name, and enriches existing matches. Semantic Scholar enriches matching accepted papers. Its uncorroborated records are held for review. The author website is held out for evaluation, never used to add papers.

Versions merge by DOI, arXiv ID, or normalized title, including transitive matches. Single-character title typos require a shared non-target coauthor and nearby years. Explicit corrections, editorials and supplementary-material entries are excluded. The seed paper is excluded from the final context. Source IDs and alternate titles remain in each JSON entry.

Counts are best-effort distinct works, not certified publication totals. Provider authorship errors and remaining title-change duplicates are possible. Missing abstracts remain null. Independent website coverage is recall against that reference page, not an overall accuracy or precision estimate.

## Ashish Vaswani

Full output: [ashishvaswani.unique.json](ashishvaswani.unique.json)

### A Training-Time Diagnostic for Generalization via the Log-Alignment Ratio

2026 · https://arxiv.org/abs/2605.28975

We study the log-alignment ratio (LAR), a measure of parameter-activation alignment, introduced in parameterization theory. We reformulate it as the overlap between a weight spectrum $p$ of the normalized squared singular values of a matrix and an activation spectrum $q$ of the normalized squared projections of inputs onto its singular directions. We show that unembedding LAR tracks the transition between memorization and generalization in two different settings by capturing the spread of $p$ and $q$ during training. In grokking, LAR predicts the effective dimension of the learned function: $k \approx n^{2(1-\text{LAR})}$, where $n$ is the input dimension of the matrix. In 3B-parameter language model pre-training, its deviation from a non-overfitting baseline tracks the generalization gap, and its rate of decline increases as overfitting approaches. LAR is computable from quantities available during the forward pass with negligible computational overhead, and requires no held-out validation data.

### Essential-Web v1.0: 24T tokens of organized web data

2025 · https://arxiv.org/abs/2506.14111

Data plays the most prominent role in how language models acquire skills and knowledge. The lack of massive, well-organized pre-training datasets results in costly and inaccessible data pipelines. We present Essential-Web v1.0, a 24-trillion-token dataset in which every document is annotated with a twelve-category taxonomy covering topic, format, content complexity, and quality. Taxonomy labels are produced by EAI-Distill-0.5b, a fine-tuned 0.5b-parameter model that achieves an annotator agreement within 3% of Qwen2.5-32B-Instruct. With nothing more than SQL-style filters, we obtain competitive web-curated datasets in math (-8.0% relative to SOTA), web code (+14.3%), STEM (+24.5%) and medical (+8.6%). Essential-Web v1.0 is available on HuggingFace: https://huggingface.co/datasets/EssentialAI/essential-web-v1.0

### Practical Efficiency of Muon for Pretraining

2025 · https://arxiv.org/abs/2505.02222

We demonstrate that Muon, the simplest instantiation of a second-order optimizer, explicitly expands the Pareto frontier over AdamW on the compute-time tradeoff. We find that Muon is more effective than AdamW in retaining data efficiency at large batch sizes, far beyond the so-called critical batch size, while remaining computationally efficient, thus enabling more economical training. We study the combination of Muon and the maximal update parameterization (muP) for efficient hyperparameter transfer and present a simple telescoping algorithm that accounts for all sources of error in muP while introducing only a modest overhead in resources. We validate our findings through extensive experiments with model sizes up to four billion parameters and ablations on the data distribution and architecture.

### Rethinking Reflection in Pre-Training

2025 · https://arxiv.org/abs/2504.04022

A language model's ability to reflect on its own reasoning provides a key advantage for solving complex problems. While most recent research has focused on how this ability develops during reinforcement learning, we show that it actually begins to emerge much earlier - during the model's pre-training. To study this, we introduce deliberate errors into chains-of-thought and test whether the model can still arrive at the correct answer by recognizing and correcting these mistakes. By tracking performance across different stages of pre-training, we observe that this self-correcting ability appears early and improves steadily over time. For instance, an OLMo2-7B model pre-trained on 4 trillion tokens displays self-correction on our six self-reflection tasks.

### DeepConsensus improves the accuracy of sequences with a gap-aware sequence transformer

2022 · https://doi.org/10.1038/s41587-022-01435-7

Abstract unavailable

## Niki Parmar

Full output: [nikiparmar.unique.json](nikiparmar.unique.json)

### Decoder Denoising Pretraining for Semantic Segmentation

2022 · https://arxiv.org/abs/2205.11423

Semantic segmentation labels are expensive and time consuming to acquire. Hence, pretraining is commonly used to improve the label-efficiency of segmentation models. Typically, the encoder of a segmentation model is pretrained as a classifier and the decoder is randomly initialized. Here, we argue that random initialization of the decoder can be suboptimal, especially when few labeled examples are available. We propose a decoder pretraining approach based on denoising, which can be combined with supervised pretraining of the encoder. We find that decoder denoising pretraining on the ImageNet dataset strongly outperforms encoder-only supervised pretraining. Despite its simplicity, decoder denoising pretraining achieves state-of-the-art results on label-efficient semantic segmentation and offers considerable gains on the Cityscapes, Pascal Context, and ADE20K datasets.

### Denoising Pretraining for Semantic Segmentation

2022 · https://doi.org/10.1109/cvprw56347.2022.00462

Semantic segmentation labels are expensive and time consuming to acquire. To improve label efficiency of semantic segmentation models, we revisit denoising autoencoders and study the use of a denoising objective for pretraining UNets. We pretrain a Transformer-based UNet as a denoising autoencoder, followed by fine-tuning on semantic segmentation using few labeled examples. Denoising pretraining outperforms training from random initialization, and even supervised ImageNet-21K pretraining of the encoder when the number of labeled images is small. A key advantage of denoising pretraining over supervised pretraining of the backbone is the ability to pretrain the decoder, which would otherwise be randomly initialized. We thus propose a novel Decoder Denoising Pretraining (DDeP) method, in which we initialize the encoder using supervised learning and pretrain only the decoder using the denoising objective. Despite its simplicity, DDeP achieves state-of-the-art results on label-efficient semantic segmentation, offering considerable gains on the Cityscapes, Pascal Context, and ADE20K datasets.

### Bottleneck Transformers for Visual Recognition

2021 · https://arxiv.org/abs/2101.11605

We present BoTNet, a conceptually simple yet powerful backbone architecture that incorporates self-attention for multiple computer vision tasks including image classification, object detection and instance segmentation. By just replacing the spatial convolutions with global self-attention in the final three bottleneck blocks of a ResNet and no other changes, our approach improves upon the baselines significantly on instance segmentation and object detection while also reducing the parameters, with minimal overhead in latency. Through the design of BoTNet, we also point out how ResNet bottleneck blocks with self-attention can be viewed as Transformer blocks. Without any bells and whistles, BoTNet achieves 44.4% Mask AP and 49.7% Box AP on the COCO Instance Segmentation benchmark using the Mask R-CNN framework; surpassing the previous best published single model and single scale results of ResNeSt evaluated on the COCO validation set. Finally, we present a simple adaptation of the BoTNet design for image classification, resulting in models that achieve a strong performance of 84.7% top-1 accuracy on the ImageNet benchmark while being up to 1.64x faster in compute time than the popular EfficientNet models on TPU-v3 hardware. We hope our simple and effective approach will serve as a strong baseline for future research in self-attention models for vision

### Scaling Local Self-Attention for Parameter Efficient Visual Backbones

2021 · https://arxiv.org/abs/2103.12731

Self-attention has the promise of improving computer vision systems due to parameter-independent scaling of receptive fields and content-dependent interactions, in contrast to parameter-dependent scaling and content-independent interactions of convolutions. Self-attention models have recently been shown to have encouraging improvements on accuracy-parameter trade-offs compared to baseline convolutional models such as ResNet-50. In this work, we aim to develop self-attention models that can outperform not just the canonical baseline models, but even the high-performing convolutional models. We propose two extensions to self-attention that, in conjunction with a more efficient implementation of self-attention, improve the speed, memory usage, and accuracy of these models. We leverage these improvements to develop a new self-attention model family, HaloNets, which reach state-of-the-art accuracies on the parameter-limited setting of the ImageNet classification benchmark. In preliminary transfer learning experiments, we find that HaloNet models outperform much larger models and have better inference performance. On harder tasks such as object detection and instance segmentation, our simple local self-attention and convolutional hybrids show improvements over very strong baselines. These results mark another step in demonstrating the efficacy of self-attention models on settings traditionally dominated by convolutional models.

### Simple and Efficient ways to Improve REALM

2021 · https://arxiv.org/abs/2104.08710

Dense retrieval has been shown to be effective for retrieving relevant documents for Open Domain QA, surpassing popular sparse retrieval methods like BM25. REALM (Guu et al., 2020) is an end-to-end dense retrieval system that relies on MLM based pretraining for improved downstream QA efficiency across multiple datasets. We study the finetuning of REALM on various QA tasks and explore the limits of various hyperparameter and supervision choices. We find that REALM was significantly undertrained when finetuning and simple improvements in the training, supervision, and inference setups can significantly benefit QA results and exceed the performance of other models published post it. Our best model, REALM++, incorporates all the best working findings and achieves significant QA accuracy improvements over baselines (~5.5% absolute accuracy) without any model design changes. Additionally, REALM++ matches the performance of large Open Domain QA models which have 3x more parameters demonstrating the efficiency of the setup.

## Łukasz Kaiser

Full output: [lukaszkaiser.unique.json](lukaszkaiser.unique.json)

### Competitive Programming with Large Reasoning Models

2025 · https://arxiv.org/abs/2502.06807

We show that reinforcement learning applied to large language models (LLMs) significantly boosts performance on complex coding and reasoning tasks. Additionally, we compare two general-purpose reasoning models - OpenAI o1 and an early checkpoint of o3 - with a domain-specific system, o1-ioi, which uses hand-engineered inference strategies designed for competing in the 2024 International Olympiad in Informatics (IOI). We competed live at IOI 2024 with o1-ioi and, using hand-crafted test-time strategies, placed in the 49th percentile. Under relaxed competition constraints, o1-ioi achieved a gold medal. However, when evaluating later models such as o3, we find that o3 achieves gold without hand-crafted domain-specific strategies or relaxed constraints. Our findings show that although specialized pipelines such as o1-ioi yield solid improvements, the scaled-up, general-purpose o3 model surpasses those results without relying on hand-crafted inference heuristics. Notably, o3 achieves a gold medal at the 2024 IOI and obtains a Codeforces rating on par with elite human competitors. Overall, these results indicate that scaling general-purpose reinforcement learning, rather than relying on domain-specific techniques, offers a robust path toward state-of-the-art AI in reasoning domains, such as competitive programming.

### OpenAI GPT-5 System Card

2025 · https://arxiv.org/abs/2601.03267

This is the system card published alongside the OpenAI GPT-5 launch, August 2025. GPT-5 is a unified system with a smart and fast model that answers most questions, a deeper reasoning model for harder problems, and a real-time router that quickly decides which model to use based on conversation type, complexity, tool needs, and explicit intent (for example, if you say 'think hard about this' in the prompt). The router is continuously trained on real signals, including when users switch models, preference rates for responses, and measured correctness, improving over time. Once usage limits are reached, a mini version of each model handles remaining queries. This system card focuses primarily on gpt-5-thinking and gpt-5-main, while evaluations for other models are available in the appendix. The GPT-5 system not only outperforms previous models on benchmarks and answers questions more quickly, but -- more importantly -- is more useful for real-world queries. We've made significant advances in reducing hallucinations, improving instruction following, and minimizing sycophancy, and have leveled up GPT-5's performance in three of ChatGPT's most common uses: writing, coding, and health. All of the GPT-5 models additionally feature safe-completions, our latest approach to safety training to prevent disallowed content. Similarly to ChatGPT agent, we have decided to treat gpt-5-thinking as High capability in the Biological and Chemical domain under our Preparedness Framework, activating the associated safeguards. While we do not have definitive evidence that this model could meaningfully help a novice to create severe biological harm -- our defined threshold for High capability -- we have chosen to take a precautionary approach.

### GPT-4o System Card

2024 · https://arxiv.org/abs/2410.21276

GPT-4o is an autoregressive omni model that accepts as input any combination of text, audio, image, and video, and generates any combination of text, audio, and image outputs. It's trained end-to-end across text, vision, and audio, meaning all inputs and outputs are processed by the same neural network. GPT-4o can respond to audio inputs in as little as 232 milliseconds, with an average of 320 milliseconds, which is similar to human response time in conversation. It matches GPT-4 Turbo performance on text in English and code, with significant improvement on text in non-English languages, while also being much faster and 50\% cheaper in the API. GPT-4o is especially better at vision and audio understanding compared to existing models. In line with our commitment to building AI safely and consistent with our voluntary commitments to the White House, we are sharing the GPT-4o System Card, which includes our Preparedness Framework evaluations. In this System Card, we provide a detailed look at GPT-4o's capabilities, limitations, and safety evaluations across multiple categories, focusing on speech-to-speech while also evaluating text and image capabilities, and measures we've implemented to ensure the model is safe and aligned. We also include third-party assessments on dangerous capabilities, as well as discussion of potential societal impacts of GPT-4o's text and vision capabilities.

### OpenAI o1 System Card

2024 · https://arxiv.org/abs/2412.16720

The o1 model series is trained with large-scale reinforcement learning to reason using chain of thought. These advanced reasoning capabilities provide new avenues for improving the safety and robustness of our models. In particular, our models can reason about our safety policies in context when responding to potentially unsafe prompts, through deliberative alignment. This leads to state-of-the-art performance on certain benchmarks for risks such as generating illicit advice, choosing stereotyped responses, and succumbing to known jailbreaks. Training models to incorporate a chain of thought before answering has the potential to unlock substantial benefits, while also increasing potential risks that stem from heightened intelligence. Our results underscore the need for building robust alignment methods, extensively stress-testing their efficacy, and maintaining meticulous risk management protocols. This report outlines the safety work carried out for the OpenAI o1 and OpenAI o1-mini models, including safety evaluations, external red teaming, and Preparedness Framework evaluations.

### tsGT: Stochastic Time Series Modeling With Transformer

2024 · https://arxiv.org/abs/2403.05713

Time series methods are of fundamental importance in virtually any field of science that deals with temporally structured data. Recently, there has been a surge of deterministic transformer models with time series-specific architectural biases. In this paper, we go in a different direction by introducing tsGT, a stochastic time series model built on a general-purpose transformer architecture. We focus on using a well-known and theoretically justified rolling window backtesting and evaluation protocol. We show that tsGT outperforms the state-of-the-art models on MAD and RMSE, and surpasses its stochastic peers on QL and CRPS, on four commonly used datasets. We complement these results with a detailed analysis of tsGT's ability to model the data distribution and predict marginal quantile values.

## Yoshua Bengio

Full output: [yoshuabengio.unique.json](yoshuabengio.unique.json)

### 1020 - Extendable Planning via Multiscale Diffusion

2026 · https://doi.org/10.48448/vrdy-g633

Long-horizon planning is crucial in complex environments, but diffusion-based planners like Diffuser are limited by the trajectory lengths observed during training. This creates a dilemma: long trajectories are needed for effective planning, yet they degrade model performance. In this paper, we introduce this extendable long-horizon planning challenge and propose a two-phase solution. First, Progressive Trajectory Extension incrementally constructs longer trajectories through multi-round compositional stitching. Second, the Hierarchical Multiscale Diffuser enables efficient training and inference over long horizons by reasoning across temporal scales. To avoid the need for multiple separate models, we propose Adaptive Plan Pondering and the Recursive HM-Diffuser, which unify hierarchical planning within a single model. Experiments show our approach yields strong performance gains, advancing scalable and efficient decision-making over long-horizons.

### A Comparative Study of Molecular Dynamics Approaches for Simulating Ionic Conductivity in Solid Lithium Electrolytes

2026 · https://arxiv.org/abs/2603.28012

Accurate prediction of ionic conductivity is critical for the design of high-performance solid-state electrolytes in next-generation batteries. We benchmark molecular dynamics (MD) approaches for computing ionic conductivity in 21 lithium solid electrolytes for which experimental ionic conductivity has been previously reported in the literature. In particular, we compare simulations driven by density functional theory (DFT) and by universal machine-learning interatomic potentials (uMLIPs), namely a MACE foundation model. We find comparable performance between DFT and MACE, despite MACE on one GPU more than 350 times faster than DFT on a 64-CPU node. The framework developed here is designed to enable systematic comparisons with additional uMLIPs and fine-tuned models in future work.

### A Discussion on “The ICML 2023 Ranking Experiment: Examining Author Self-Assessment in ML/AI Peer Review”

2026 · https://doi.org/10.1080/01621459.2025.2549338

We would like to begin by congratulating the authors not only for contributing an important study but also for its acceptance into JASA. This article tackles a critical and challenging problem: how...

### Adaptive Order Policies for Masked Diffusion

2026 · https://arxiv.org/abs/2606.00295

Masked diffusion models have seen great success in capturing data distributions over discrete sequences in domains such as text and proteins. These models generate data by iteratively unmasking tokens starting from a fully masked sequence, with the unmasking order typically chosen at random or using a heuristic based on denoiser probabilities. In this work, we propose a scheme for learning the unmasking order using an additional lightweight policy network on top of a diffusion model. Our proposed loss reweights terms in the masked diffusion loss according to policy probabilities, and results in a policy that prefers positions where the denoiser is more likely to be correct. We study this loss in two settings: (i) training solely the policy while using a frozen pre-trained denoiser, and (ii) training the policy and denoiser jointly with the weighted loss to allow for mutual adaptation. We demonstrate that our approach outperforms common heuristics on problems that are sensitive to token ordering, such as combinatorial problems, proteins as well as various coding and language tasks.

### AI Epistemic Risks: Emerging Mechanisms & Evidence

2026 · https://doi.org/10.2139/ssrn.6873005

Abstract unavailable

## Terence Tao

Full output: [terencetao.unique.json](terencetao.unique.json)

### A Severe Misalignment of AI in Mathematics

2026 · https://doi.org/10.5281/zenodo.22737750

Abstract unavailable

### Affidavit of Support [SponsorShip Path]

2026 · https://doi.org/10.5281/zenodo.21830605

We are grateful for the Opportunity to apply to Biola University. The platform is requesting an affidavit of Support. In the Internet Guidelines, Some Institutions can offer Affidavit of Support as SponsorShip Investments.

### Application to Dalhousie University September 2026 : A Quick Note About Information System Classifications

2026 · https://doi.org/10.5281/zenodo.22877860

We have started an Application into The Dalhousie University English Program. We notice for the first time a very intelligent information system. Some documents that we did save in our Google Drive Account [but not published elsewhere*] have contributive value in the system. As for example, an E-Mail notification from Googleabout Switzerland is classified and accepted as Visiting Research Invitation letter.

### Bank Systems

2026 · https://doi.org/10.5281/zenodo.21879495

We are introducing the Axiomatization Framework of Bank Systems. Some theorems are completed about Housing, and other Assets Management.

### Building a Stack for Systems Deployment

2026 · https://doi.org/10.5281/zenodo.21855554

We are introducing few lines of methodology to start building Models & Systems for Deployment. We start first with Asana Platform and the Automated Fact-Checker [here]. More Collaboration Invitation will be sent to participate in the project.

## Heng Li

Full output: [hengli.unique.json](hengli.unique.json)

### A Higher-Order Clique Density Theorem

2026 · https://arxiv.org/abs/2607.06545

Reiher's clique density theorem determines the sharp lower envelope for the density of $K_r$ at fixed edge density. We prove a higher-order version in which the prescribed quantity is itself a clique density. For every $3\le s<r$, we determine the minimum possible $K_r$-density among graphons with prescribed $K_s$-density. For $s\ge3$ the constraint is genuinely nonlinear and leaves the edge density undetermined; nevertheless, on the positive range the sharp lower boundary is the classical multipartite edge-to-clique profile, reparametrised by $K_s$-density. We also prove stability on the positive branches of this profile: at every interior point, near extremality forces cut-distance closeness to the corresponding extremal family at the induced edge density.

### AnimateCanvas: Learning Implicit Motion Planning from Composable Kinematic Cues

2026 · https://arxiv.org/abs/2609.10457

Professional character animation requires both natural motion and precise, versatile control. For example, creators often define the timing of a specified action, control the motion range of the character's arm swing, or specify the route the character walks through--effectively placing various kinematic cues on a motion canvas. This motivates us to propose AnimateCanvas, a model that supports cue-conditioned implicit motion planning to faithfully and coherently connect all cues, dense or sparse, full or partial, into one full-body motion sequence. Specifically, AnimateCanvas represents heterogeneous kinematic cues on a shared motion canvas, where position and rotation values are specified across body joints and time. A shared flow-matching model generates motion conditioned on this canvas, with optional language and input motion; cue imputation keeps the specified canvas values fixed in both training and sampling. To learn coherent completion across different cue sets, we train with a compositional cue sampler that varies the timing of cue application, the positions or rotations specified, and how they are combined. Together, these designs enable a single generator to integrate heterogeneous kinematic cues into coherent full-body actions, giving creators fine-grained control over selected frames, joints, and position or rotation channels. We evaluate this planning ability on temporal, root, and body-part cues--alone and combined--as well as language-guided editing, and naturally extend it to sequential generation and motion repair. AnimateCanvas achieves state-of-the-art results in temporal completion, spatial control, sequential generation, language-guided editing, and motion repair, while retaining strong text-to-motion capability.

### Data from Improving Long-Read Somatic Structural Variant Calling with Pangenome and De Novo Personal Genome Assembly

2026 · https://doi.org/10.1158/2767-9764.c.8743745

Abstract Accurate detection of mosaic and somatic structural variants (SV) provides early diagnostic and therapeutic evidence for cancers. Although long-read whole-genome sequencing leads to more accurate SV detection than short-read sequencing, existing long-read SV callers only look at alignment against a single reference genome and are susceptible to systematic false discovery caused by germline differences between the individual genome and the reference genome. In this study, we develop a new SV filtering method that jointly considers the alignment against a pangenome and the de novo assembly of the germline genome. It dramatically reduces false-positive mosaic and somatic SVs in cancer cell lines with little loss in sensitivity for existing long-read SV callers. Our study highlights the essential need for pangenome or personal genome assembly to integrate SV calls for both SV discoveries and clinical diagnostics. Significance: We introduced a novel long-read SV filtering method that leverages pangenome and personal genome data and greatly improves the accuracy of somatic SV calling.

### Detecting foldback artifacts in long-reads

2026 · https://doi.org/10.1186/s12864-025-12492-y

Long-read sequencing data is useful for detecting large and complex structural variations; however, technical artifacts can lead to false structural variant calls. In our analyses, we became aware of a foldback artifact in long-read data. Therefore, we developed the open-source Breakinator tool to flag putative foldback artifact reads, as well as previously known chimeric artifacts. Through an alignment-based approach, Breakinator can detect artifacts missed by existing quality control tools. We profiled the occurrences of foldbacks and chimeric reads in both Oxford Nanopore and PacBio sequences across a range of specimens, library types, sequencing chemistries, sequencing machines, and base-calling software.

### Early and Prediagnostic Detection of Pancreatic Cancer from Computed Tomography

2026 · https://arxiv.org/abs/2601.22134

Pancreatic ductal adenocarcinoma (PDAC), one of the deadliest solid malignancies, is often detected at a late and inoperable stage. Retrospective reviews of prediagnostic CT scans, when conducted by expert radiologists aware that the patient later developed PDAC, frequently reveal lesions that were previously overlooked. To help detecting these lesions earlier, we developed an automated system named ePAI (early Pancreatic cancer detection with Artificial Intelligence). It was trained on data from 1,598 patients from a single medical center. In the internal test involving 1,009 patients, ePAI achieved an area under the receiver operating characteristic curve (AUC) of 0.939-0.999, a sensitivity of 95.3%, and a specificity of 98.7% for detecting small PDAC less than 2 cm in diameter, precisely localizing PDAC as small as 2 mm. In an external test involving 7,158 patients across 6 centers, ePAI achieved an AUC of 0.918-0.945, a sensitivity of 91.5%, and a specificity of 88.0%, precisely localizing PDAC as small as 5 mm. Importantly, ePAI detected PDACs on prediagnostic CT scans obtained 3 to 36 months before clinical diagnosis that had originally been overlooked by radiologists. It successfully detected and localized PDACs in 75 of 159 patients, with a median lead time of 347 days before clinical diagnosis. Our multi-reader study showed that ePAI significantly outperformed 30 board-certified radiologists by 50.3% (P < 0.05) in sensitivity while maintaining a comparable specificity of 95.4% in detecting PDACs early and prediagnostic. These findings suggest its potential of ePAI as an assistive tool to improve early detection of pancreatic cancer.

## Richard A. Neher

Independent author-page coverage (including seed): 112/112.

Full output: [richardaneher.unique.json](richardaneher.unique.json)

### Epistasis and the changing fitness landscapes of SARS-CoV-2

2026 · https://doi.org/10.64898/2026.03.12.711354

Since its emergence in late 2019, millions of SARS-CoV-2 genomes have been generated as part of global efforts to monitor the evolution and spread of the virus. This unprecedented volume of data provides a unique opportunity to study viral evolution at unparalleled resolution. In particular, individual genomic sites can be observed to have mutated independently thousands of times. These mutation counts have been used to estimate site-specific mutation rates and fitness effects for most mutations across the viral genome. Here, we use these data to investigate how the landscape of mutational fitness costs has changed over the course of the pandemic. SARS-CoV-2 evolution over the past six years has been characterized by the emergence of distinct variants separated by long branches corresponding to evolutionary saltations involving up to 50 mutations. We compare inferred fitness landscapes of the Spike protein across these variants and find that shifts in the estimated effects of non-synonymous mutations are linked to genetic differences between them. Sites with altered fitness costs are enriched near positions where the genetic backgrounds differ. To explain the observed changes, we introduce a model with pairwise epistatic interactions between mutations and residues that differ between variants. This model is able to explain about half of the variance in the shifts of fitness effects and suggests that each mismatch between variants substantially alters mutation effects at typically 1 to 3 additional positions.

### Near real-time data on the human neutralizing antibody landscape to influenza virus as of early 2026 to inform vaccine-strain selection

2026 · https://doi.org/10.1093/ve/veag046

Twice each year, a decision is made on whether to update the strains included in the seasonal influenza vaccine to better match the most recent circulating viral strains. To characterize the antigenic properties of current seasonal influenza A strains to inform the upcoming decision about which strains to include in the 2026-7 Northern Hemisphere vaccine, here we perform high-throughput sequencing-based neutralization assays using a library of 57 H3N2 and 34 H1N1 influenza hemagglutinins reflecting the circulating diversity of strains in late 2025 to early 2026. We assay this library against 302 human sera collected in late 2025. The resulting data set encompasses 27 409 titres and provides a near real-time portrait of the human neutralizing antibody landscape against influenza virus. We find that many human sera have lower titres against the K subclade of H3N2 and the D.3.1.1 subclade of H1N1; these subclades have recently become dominant among their respective subtypes. Our measurements also reveal variability in titres to different subvariants within the K subclade of H3N2, with titres especially low to subclade K strains with additional mutations in antigenic regions D and E. We make all our data and accompanying visualizations publicly available to enable their use in vaccine-strain selection and analyses of influenza evolution and immunity.

### neherlab/SARS-CoV-2_variant-reports: 2026-06-01

2026 · https://doi.org/10.5281/zenodo.20490274

Informal summaries of notable SARS-CoV-2 lineages

### neherlab/SARS2-mut-fitness-v2: Version curresponding to Haddox et al, 2025

2026 · https://doi.org/10.5281/zenodo.20920679

This repository contains code and results for the publication Haddox et al, doi.org/10.1093/nar/gkaf503

### neherlab/SC2Epistasis: Resubmission of the manuscript to Genetics in July 2026

2026 · https://doi.org/10.5281/zenodo.20490206

Package for quantifying epistasis in the SARS-CoV-2 mutational fitness landscape

## Nonexistent Test Author Zqxv

Full output: [nonexistenttestauthorzqxv.unique.json](nonexistenttestauthorzqxv.unique.json)
