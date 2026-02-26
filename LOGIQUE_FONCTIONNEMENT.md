# 🚀 Kifah ykhdem Pharmasssit (Logique de fonctionnement)

Hada fih chre7 simple l'application ta3ek, kifah l'information t'fout m'l "Question" ta3 l'utilisateur 👤 lel "Réponse" ta3 l'AI 🤖.

---

## 🏗️ 1. Architecture simple
L'app t'khdem b **3 7wayej principal**:
1. **Frontend (React)**: El-wejha li ychoufha l'utilisateur.
2. **Database (Supabase)**: Win rkoum m'khabyin les médicaments (les données cliniques).
3. **AI (Groq - Llama 3.3)**: El-mokh li y'jawni w y'fhem l'context.

---

## 🔄 2. Le Chemin de la Question (Flow)

### **Étape 1: التحليل (L'Analyse)**
Ki l'utilisateur y'kteb question (ex: *"Dose ta3 Paracétamol l'enfant 15kg ?"*):
- L'app t'beddel dik el-hedra l' **Vector** (384 Number). Heda s'miwah **Semantic Search** (Bach y'fhem el-ma3na, machi ghir el-klimat).

### **Étape 2: البحث (La Recherche)**
L'app t'rouh l' **Supabase** w t'7awess 3la les médicaments li 3endhoum nafs el-ma3na m3a l'question. 
- T'jib l'information el-7a9i9ia (Dosage, Contre-indications, CNK...) m'les fichiers JSON li rkoum m'uploddyin.

### **Étape 3: التوليد (La Génération)**
Dork l'app t'med l'hadik l'information (Base de données) + l'Question ta3 l'expert l' **AI (Groq)**.
- L'AI may'khterach m'3endou (Zero Hallucination). Y'dir ghir **Formatage** l'hadik l'info bach t'ji chabba w m'nessma.

---

## 🛠️ 3. Les points forts (Tech Stack)

| Tech | Role |
| :--- | :--- |
| **Vite / React** | Sre3a fel wejha (Performance) |
| **Tailwind CSS** | Design moderne w clean |
| **Framer Motion** | Les animations (Typing effect, Fade in...) |
| **pgvector** | Recherche intelligente (Semantic) |
| **Edge Functions** | Logic m'khabbi fel Cloud (Sécurité) |

---

## 🔒 4. Sécurité & Précision
- **Machi ChatGPT 3adi**: L'AI rahi m'7essra (Constrained) b les données cliniques ta3ek bark. 
- **Tracabilité**: Kol reponse fiha score de confiance w source m'l base de données.

---

### 📂 Fichiers li t'9der t'choufhoum bach t'fhem kther:
- `HOW_APP_WORKS_COMPLETE.md`: Chre7 détaillé b'zaf (Technical).
- `APP_ANALYSIS.md`: Analyse ta3 el-code kifah rah m'rekkeb.
- `src/pages/Chat.tsx`: Win t'sra el-khedma kamel.

---
**Pharmasssit - AI Medical Assistant 🇧🇪**
