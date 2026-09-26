import fs from 'fs';
import path from 'path';

export interface PolicyChunk {
  policyFileName: string;
  policyTitle: string;
  sectionTitle: string;
  content: string;
  tokens: string[];
}

export interface SearchResult {
  policyTitle: string;
  sectionTitle: string;
  content: string;
  score: number;
}

export class RAGService {
  private static chunks: PolicyChunk[] = [];
  private static idfMap: Map<string, number> = new Map();
  private static initialized = false;

  private static STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'could', 'did', 'do', 'does', 'doing', 'down', 'during',
    'each', 'few', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
    'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
    'just', 'me', 'more', 'most', 'my', 'myself',
    'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'she', 'should', 'so', 'some', 'such',
    'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  /**
   * Tokenizes text into normalized stems/words
   */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 1 && !this.STOP_WORDS.has(word));
  }

  /**
   * Loads markdown policy documents and indexes semantic chunks
   */
  public static initializeKnowledgeBase() {
    if (this.initialized) return;

    const policiesDir = path.resolve(__dirname, 'policies');
    if (!fs.existsSync(policiesDir)) {
      console.warn(`[RAG Engine] Policies directory not found at: ${policiesDir}`);
      return;
    }

    const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.md'));
    this.chunks = [];

    files.forEach((file) => {
      const fullPath = path.join(policiesDir, file);
      const text = fs.readFileSync(fullPath, 'utf8');

      const lines = text.split('\n');
      let policyTitle = file.replace('.md', '').replace(/-/g, ' ');
      let currentSection = 'General Overview';
      let currentContent: string[] = [];

      for (const line of lines) {
        if (line.startsWith('# ')) {
          policyTitle = line.replace('# ', '').trim();
        } else if (line.startsWith('## ')) {
          if (currentContent.length > 0) {
            const contentStr = currentContent.join('\n').trim();
            this.chunks.push({
              policyFileName: file,
              policyTitle,
              sectionTitle: currentSection,
              content: contentStr,
              tokens: this.tokenize(currentSection + ' ' + contentStr),
            });
            currentContent = [];
          }
          currentSection = line.replace('## ', '').trim();
        } else {
          currentContent.push(line);
        }
      }

      if (currentContent.length > 0) {
        const contentStr = currentContent.join('\n').trim();
        this.chunks.push({
          policyFileName: file,
          policyTitle,
          sectionTitle: currentSection,
          content: contentStr,
          tokens: this.tokenize(currentSection + ' ' + contentStr),
        });
      }
    });

    // Compute IDF
    const totalDocs = this.chunks.length;
    const docFreq = new Map<string, number>();

    this.chunks.forEach((chunk) => {
      const uniqueTokens = new Set(chunk.tokens);
      uniqueTokens.forEach((token) => {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      });
    });

    this.idfMap.clear();
    docFreq.forEach((freq, token) => {
      this.idfMap.set(token, Math.log((totalDocs + 1) / (freq + 1)) + 1);
    });

    this.initialized = true;
    console.log(`🧠 [RAG Engine] Initialized with ${this.chunks.length} semantic policy chunks from ${files.length} policies.`);
  }

  /**
   * Calculates TF-IDF vector score for a query against a chunk
   */
  private static calculateScore(queryTokens: string[], chunk: PolicyChunk): number {
    const chunkTokenCounts = new Map<string, number>();
    chunk.tokens.forEach((t) => chunkTokenCounts.set(t, (chunkTokenCounts.get(t) || 0) + 1));

    let score = 0;
    queryTokens.forEach((qToken) => {
      const count = chunkTokenCounts.get(qToken) || 0;
      if (count > 0) {
        const tf = count / chunk.tokens.length;
        const idf = this.idfMap.get(qToken) || 1.0;
        score += tf * idf;
      }
    });

    // Boost score if query matches the section title directly
    const sectionTokens = this.tokenize(chunk.sectionTitle);
    queryTokens.forEach((qt) => {
      if (sectionTokens.includes(qt)) {
        score += 0.5;
      }
    });

    return score;
  }

  /**
   * Searches company policies and synthesizes an intelligent answer
   */
  public static query(userQuestion: string): {
    question: string;
    answer: string;
    relevantPolicies: SearchResult[];
  } {
    this.initializeKnowledgeBase();

    const queryTokens = this.tokenize(userQuestion);
    if (queryTokens.length === 0) {
      return {
        question: userQuestion,
        answer: 'Please provide a specific query regarding company policies, such as leave entitlements, health insurance, gratuity, or payroll deductions.',
        relevantPolicies: [],
      };
    }

    const scored = this.chunks
      .map((chunk) => ({
        policyTitle: chunk.policyTitle,
        sectionTitle: chunk.sectionTitle,
        content: chunk.content,
        score: this.calculateScore(queryTokens, chunk),
      }))
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return {
        question: userQuestion,
        answer: "I couldn't find an exact match in our active company policies. For specialized inquiries, please contact HR Admin directly or check the official document vault.",
        relevantPolicies: [],
      };
    }

    const top = scored[0];
    const answer = `Based on the **${top.policyTitle}** (${top.sectionTitle}):\n\n${top.content}\n\n*Reference: Company Internal Policy Handbook.*`;

    return {
      question: userQuestion,
      answer,
      relevantPolicies: scored,
    };
  }

  /**
   * Lists all indexed policies
   */
  public static listPolicies(): Array<{ title: string; sectionsCount: number }> {
    this.initializeKnowledgeBase();
    const map = new Map<string, number>();

    this.chunks.forEach((chunk) => {
      map.set(chunk.policyTitle, (map.get(chunk.policyTitle) || 0) + 1);
    });

    return Array.from(map.entries()).map(([title, sectionsCount]) => ({
      title,
      sectionsCount,
    }));
  }
}
