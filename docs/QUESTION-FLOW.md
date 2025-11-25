# Question Flow Design

## Overview

The question flow uses multiple-choice components to quickly collect context before generating AI coaching. Users tap through questions rapidly, making the experience feel snappy and intuitive.

## Question Flow Structure

### 1. What trick do you want to do?

**Component:** `TrickSearchInput`

**UI:** Text input with autocomplete suggestions

**Behavior:**
- User types trick name (e.g., "backside 180", "method", "carving")
- As they type, search through video titles/transcripts for matching content
- Show suggestions based on available video content
- If no exact match, still accept their input (free text)
- Show popular tricks as quick suggestions below input

**Popular Suggestions (if empty):**
- Backside 180
- Frontside 180
- Carving
- Switch Riding
- Method

**Search Logic:**
- Search video titles for trick name
- If found, prioritize those videos in coaching response
- If not found, use general technique videos

---

### 2. What size feature are you doing?

**Component:** `FeatureSizeSelector`

**Options:**
- Small (< 10 ft)
- Medium (10-20 ft)
- Large (20-40 ft)
- XL (40+ ft)
- Flat ground

**UI:** Horizontal slider or large buttons with visual size indicators

---

### 3. Have you landed the pre-trick?

**Component:** `BinaryChoice` (reusable)

**Options:**
- Yes, consistently
- Yes, sometimes
- No, still learning
- What's a pre-trick?

**UI:** Large tap buttons, stacked vertically

---

### 4. How are your edge transfers?

**Component:** `SkillLevelSelector` (reusable)

**Options:**
- 🟢 Good - I'm comfortable
- 🟡 Okay - Need some work
- 🔴 Struggling - Need help

**UI:** Three large buttons with emoji indicators

---

### 5. What are the issues?

**Component:** `IssueSelector`

**Options (multi-select):**
- Can't get enough rotation
- Landing off-balance
- Catching edges
- Not spotting landing
- Scared of commitment
- Inconsistent pop
- Wrong body position
- Speed control
- Other (text input)

**UI:** Chip/tag selection (can select multiple)

---

### 6. Can you spot the landing for the full rotation?

**Component:** `BinaryChoice`

**Options:**
- Yes
- No
- Sometimes
- Not sure what this means

**UI:** Large tap buttons

---

### 7. How consistently are you landing this trick?

**Component:** `ConsistencySelector`

**Options:**
- Always (9/10 times)
- Usually (7/10 times)
- Sometimes (5/10 times)
- Rarely (2/10 times)
- Never landed it yet

**UI:** Slider with percentage indicators or large buttons

---

### 8. Do you feel in control during this trick?

**Component:** `BinaryChoice`

**Options:**
- Yes, feels controlled
- Mostly, but sketchy sometimes
- No, feels out of control
- Haven't tried it yet

**UI:** Large tap buttons

---

## Reusable Components

### `BinaryChoice`
Simple yes/no or multiple choice with 2-4 options
```typescript
<BinaryChoice
  question="Have you landed the pre-trick?"
  options={[
    { value: 'yes', label: 'Yes, consistently', emoji: '✅' },
    { value: 'sometimes', label: 'Yes, sometimes', emoji: '🤔' },
    { value: 'no', label: 'No, still learning', emoji: '❌' },
  ]}
  onSelect={(value) => handleAnswer(value)}
/>
```

### `SkillLevelSelector`
Three-level skill assessment (Good/Okay/Struggling)
```typescript
<SkillLevelSelector
  question="How are your edge transfers?"
  onSelect={(level) => handleAnswer(level)}
/>
```

### `MultiSelect`
Select multiple options (for issues, goals, etc.)
```typescript
<MultiSelect
  question="What are the issues?"
  options={issueOptions}
  onComplete={(selected) => handleAnswer(selected)}
/>
```

### `TrickSearchInput`
Text input with autocomplete based on video content
```typescript
<TrickSearchInput
  placeholder="e.g., backside 180, method, carving..."
  videoTitles={allVideoTitles} // Search through these
  onSelect={(trick) => handleAnswer(trick)}
  popularSuggestions={['Backside 180', 'Carving', 'Method']}
/>
```

### `SliderChoice`
Slider for ranges (consistency, confidence, etc.)
```typescript
<SliderChoice
  question="How consistently are you landing this?"
  min={0}
  max={10}
  labels={['Never', 'Sometimes', 'Always']}
  onSelect={(value) => handleAnswer(value)}
/>
```

## Flow Visualization

```
┌─────────────────────────────┐
│  What trick?                │
│                             │
│  ┌─────────────────────┐   │
│  │ backside 180_       │   │
│  └─────────────────────┘   │
│                             │
│  Suggestions:               │
│  • Backside 180             │
│  • Backside 360             │
│  • Backside 540             │
│                             │
│  Popular:                   │
│  [Carving] [Method] [Switch]│
│                             │
│  Progress: ●○○○○○○○         │
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│  What size feature?         │
│                             │
│  ┌─────────────────────┐   │
│  │ ● Small             │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │   Medium            │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │   Large             │   │
│  └─────────────────────┘   │
│                             │
│  Progress: ●●○○○○○○         │
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│  Have you landed the        │
│  pre-trick?                 │
│                             │
│  ┌─────────────────────┐   │
│  │ ✅ Yes, consistently│   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 🤔 Yes, sometimes   │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ ❌ No, still learning│   │
│  └─────────────────────┘   │
│                             │
│  Progress: ●●●○○○○○         │
└─────────────────────────────┘
              ↓
          (continue...)
              ↓
┌─────────────────────────────┐
│  ✅ All set!                │
│                             │
│  Getting your personalized  │
│  coaching advice...         │
│                             │
│  [Loading animation]        │
└─────────────────────────────┘
```

## Smart Defaults & Skip Logic

### Skip Logic Examples:

**If trick = "Carving":**
- Skip "feature size" (not relevant)
- Skip "spotting landing" (not relevant)
- Focus on edge control questions

**If trick = "Flat ground" tricks:**
- Skip "feature size"
- Add questions about surface conditions

**If "Haven't tried it yet":**
- Skip consistency questions
- Focus on prerequisites and fundamentals

### Smart Defaults:

**If user previously answered similar questions:**
- Pre-fill with last answers
- Show "Use previous answers?" option
- Allow quick confirmation or edit

## Animation & Transitions

### Page Transitions:
- Slide left when advancing
- Slide right when going back
- Smooth 300ms transitions

### Button Interactions:
- Scale up slightly on press (1.05x)
- Haptic feedback on selection
- Checkmark animation on select

### Progress Indicator:
- Animated progress bar
- Show current step / total steps
- Smooth fill animation

## Accessibility

- Large tap targets (min 44x44 points)
- High contrast colors
- Clear labels
- Support for VoiceOver/TalkBack
- Keyboard navigation support

## Data Structure

```typescript
interface QuestionFlowData {
  trick: string;
  featureSize?: 'small' | 'medium' | 'large' | 'xl' | 'flat';
  preTrick: 'yes' | 'sometimes' | 'no' | 'unknown';
  edgeTransfers: 'good' | 'okay' | 'struggling';
  issues: string[]; // Array of selected issues
  spotLanding: boolean | 'sometimes' | 'unknown';
  consistency: 0 | 2 | 5 | 7 | 9; // Out of 10
  control: 'yes' | 'mostly' | 'no' | 'untried';
  completedAt: Date;
}
```

## Example Component Usage

```typescript
// In QuestionFlowScreen.tsx
const [currentStep, setCurrentStep] = useState(0);
const [answers, setAnswers] = useState<Partial<QuestionFlowData>>({});

const questions = [
  {
    id: 'trick',
    component: TrickSearchInput,
    props: {
      placeholder: "e.g., backside 180, method, carving...",
      videoTitles: allVideoTitles,
      popularSuggestions: ['Backside 180', 'Carving', 'Method', 'Switch'],
      onSelect: (trick) => handleAnswer('trick', trick)
    }
  },
  {
    id: 'featureSize',
    component: FeatureSizeSelector,
    props: {
      onSelect: (size) => handleAnswer('featureSize', size)
    },
    skip: () => answers.trick === 'Carving' // Skip logic
  },
  {
    id: 'preTrick',
    component: BinaryChoice,
    props: {
      question: "Have you landed the pre-trick?",
      options: preTrickOptions,
      onSelect: (value) => handleAnswer('preTrick', value)
    }
  },
  // ... more questions
];

const CurrentQuestion = questions[currentStep].component;

return (
  <View>
    <ProgressBar current={currentStep} total={questions.length} />
    <CurrentQuestion {...questions[currentStep].props} />
  </View>
);
```

## Benefits of This Approach

1. **Fast:** Users can tap through in 10-15 seconds
2. **Clear:** No typing required for most questions
3. **Flexible:** Easy to add/remove questions
4. **Reusable:** Components work across different flows
5. **Smart:** Skip logic adapts to user's situation
6. **Accessible:** Large targets, clear labels
7. **Delightful:** Smooth animations and feedback

This creates a much better UX than a traditional form or free-text chat for collecting structured data.
