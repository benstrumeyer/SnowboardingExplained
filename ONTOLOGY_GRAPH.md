# Snowboarding Ontology Graph

## Core Concepts and Relationships

```mermaid
graph TD
    A["🏂 SNOWBOARDING FUNDAMENTALS"]
    
    A --> B["POP<br/>Explosive leg extension"]
    A --> C["EDGE CONTROL<br/>Board edge grip"]
    A --> D["BODY POSITION<br/>Alignment & posture"]
    A --> E["COMMITMENT<br/>Mental & physical"]
    
    B --> F["ROTATION<br/>Spinning motion"]
    C --> G["LANDING<br/>Contact with snow"]
    D --> G
    E --> G
    
    F --> H["SPINS<br/>180/360/540/720"]
    G --> I["BLIND LANDING<br/>Can't see zone"]
    
    A --> J["SWITCH RIDING<br/>Opposite stance"]
    A --> K["GRAB<br/>Hold the board"]
    
    H --> L["FRONTSIDE SPINS"]
    H --> M["BACKSIDE SPINS"]
    
    L --> N["FS 180"]
    L --> O["FS 360"]
    L --> P["FS 540"]
    L --> Q["FS 720"]
    
    M --> R["BS 180"]
    M --> S["BS 360"]
    M --> T["BS 540"]
    M --> U["BS 720"]
    
    style A fill:#ff6b6b
    style B fill:#4ecdc4
    style C fill:#4ecdc4
    style D fill:#4ecdc4
    style E fill:#4ecdc4
    style F fill:#45b7d1
    style G fill:#45b7d1
    style I fill:#f9ca24
    style J fill:#6c5ce7
    style K fill:#a29bfe
```

## Problem Categories and Solutions

```mermaid
graph LR
    A["LANDING PROBLEMS"]
    
    A --> B["FALLING FORWARD<br/>Weight too far forward"]
    A --> C["FALLING BACKWARD<br/>Weight too far back"]
    A --> D["CATCHING EDGE<br/>Edge too sharp"]
    A --> E["SLIDING OUT<br/>Edge too light"]
    
    B --> B1["❌ Not enough pop<br/>❌ Over-rotating"]
    B --> B2["✅ Shift weight back<br/>✅ Increase pop"]
    
    C --> C1["❌ Under-rotating<br/>❌ Late pop"]
    C --> C2["✅ Complete rotation<br/>✅ Pop earlier"]
    
    D --> D1["❌ Board twisted<br/>❌ Uneven weight"]
    D --> D2["✅ Align board<br/>✅ Distribute weight"]
    
    E --> E1["❌ Not enough grip<br/>❌ Flat base landing"]
    E --> E2["✅ Increase pressure<br/>✅ Engage edge"]
    
    style A fill:#ff6b6b
    style B fill:#ffa502
    style C fill:#ffa502
    style D fill:#ffa502
    style E fill:#ffa502
    style B2 fill:#26de81
    style C2 fill:#26de81
    style D2 fill:#26de81
    style E2 fill:#26de81
```

## Concept Dependencies

```mermaid
graph TD
    A["LANDING SUCCESS"]
    
    A --> B["Body Position"]
    A --> C["Edge Control"]
    A --> D["Commitment"]
    
    B --> B1["Head Position"]
    B --> B2["Shoulder Alignment"]
    B --> B3["Hip Position"]
    B --> B4["Knee Bend"]
    
    C --> C1["Toe Edge"]
    C --> C2["Heel Edge"]
    C --> C3["Edge Pressure"]
    
    D --> D1["Mental Commitment"]
    D --> D2["Full Rotation"]
    D --> D3["Blind Landing"]
    
    B1 --> E["Spotting"]
    B2 --> E
    B3 --> E
    B4 --> E
    
    C1 --> F["Grip"]
    C2 --> F
    C3 --> F
    
    D1 --> G["No Hesitation"]
    D2 --> G
    D3 --> G
    
    E --> H["SUCCESSFUL LANDING"]
    F --> H
    G --> H
    
    style A fill:#ff6b6b
    style H fill:#26de81
    style E fill:#4ecdc4
    style F fill:#4ecdc4
    style G fill:#4ecdc4
```

## Trick Categories Hierarchy

```mermaid
graph TD
    A["SNOWBOARD TRICKS"]
    
    A --> B["SPINS<br/>Rotation tricks"]
    A --> C["RAILS<br/>Sliding tricks"]
    A --> D["GRABS<br/>Board grabs"]
    A --> E["FOUNDATIONAL<br/>Core techniques"]
    
    B --> B1["Frontside Spins"]
    B --> B2["Backside Spins"]
    B --> B3["Switch Spins"]
    B --> B4["Cab Tricks"]
    
    C --> C1["Boardslide"]
    C --> C2["Lipslide"]
    C --> C3["50-50"]
    
    D --> D1["Indy"]
    D --> D2["Melon"]
    D --> D3["Stalefish"]
    D --> D4["Mute"]
    
    E --> E1["Pop"]
    E --> E2["Edge Control"]
    E --> E3["Body Position"]
    E --> E4["Carving"]
    
    style A fill:#ff6b6b
    style B fill:#4ecdc4
    style C fill:#45b7d1
    style D fill:#a29bfe
    style E fill:#f9ca24
```

## Domain Concept Map

```mermaid
graph TB
    subgraph Fundamentals["🏂 FUNDAMENTALS"]
        Pop["POP"]
        Edge["EDGE CONTROL"]
        Body["BODY POSITION"]
        Commit["COMMITMENT"]
    end
    
    subgraph Techniques["🎯 TECHNIQUES"]
        Rotation["ROTATION"]
        Landing["LANDING"]
        Blind["BLIND LANDING"]
        Switch["SWITCH RIDING"]
        Grab["GRAB"]
    end
    
    subgraph Problems["⚠️ PROBLEMS"]
        FallFwd["Falling Forward"]
        FallBck["Falling Backward"]
        CatchEdge["Catching Edge"]
        SlideOut["Sliding Out"]
        UnderRot["Under-rotating"]
        OverRot["Over-rotating"]
    end
    
    subgraph Tricks["🎪 TRICKS"]
        Spins["Spins<br/>180-1080°"]
        Rails["Rails<br/>Boardslide, 50-50"]
        Grabs["Grabs<br/>Indy, Melon, etc"]
    end
    
    Pop --> Rotation
    Edge --> Landing
    Body --> Landing
    Commit --> Blind
    
    Rotation --> Spins
    Landing --> Tricks
    Blind --> Tricks
    Switch --> Tricks
    Grab --> Tricks
    
    Landing --> FallFwd
    Landing --> FallBck
    Edge --> CatchEdge
    Edge --> SlideOut
    Rotation --> UnderRot
    Rotation --> OverRot
    
    style Pop fill:#4ecdc4
    style Edge fill:#4ecdc4
    style Body fill:#4ecdc4
    style Commit fill:#4ecdc4
    style Rotation fill:#45b7d1
    style Landing fill:#45b7d1
    style Blind fill:#f9ca24
    style Switch fill:#6c5ce7
    style Grab fill:#a29bfe
    style FallFwd fill:#ff6b6b
    style FallBck fill:#ff6b6b
    style CatchEdge fill:#ff6b6b
    style SlideOut fill:#ff6b6b
    style UnderRot fill:#ff6b6b
    style OverRot fill:#ff6b6b
    style Spins fill:#26de81
    style Rails fill:#26de81
    style Grabs fill:#26de81
```

## How Domain Classification Works

```mermaid
sequenceDiagram
    participant User
    participant Classifier
    participant Ontology
    participant Pinecone
    participant Response
    
    User->>Classifier: "Why do I keep falling on my BS 720?"
    
    Classifier->>Ontology: Extract concepts
    Ontology-->>Classifier: trick=BS720, concepts=[landing, body_position, commitment], problem=falling_forward
    
    Classifier->>Pinecone: Filter by trick + problem + concepts
    Pinecone-->>Classifier: Relevant tips (50 instead of 1166)
    
    Classifier->>Response: Generate answer with domain context
    Response-->>User: Personalized coaching response
    
    Note over Classifier: 1 Gemini call for classification<br/>1 Pinecone query with filters<br/>Much faster & more relevant
```

## Key Insights

### Before (Semantic Search Only)
- Search all 1166 records
- Get mixed results (landing tips + BS720 tips + rotation tips)
- Gemini has to synthesize from noisy data
- Slow and expensive

### After (Domain-Aware Hybrid)
- Classify question using ontology
- Filter Pinecone by: trick + problem + concepts
- Search ~50 relevant records
- Gemini synthesizes from clean, focused data
- Fast, cheap, and accurate

### The Semantic Gap Bridge
- **General LLM**: "landing" = any contact with ground
- **Snowboarding**: "landing" = specific technique with body position, edge control, commitment
- **Ontology**: Defines snowboarding-specific meaning
- **Classifier**: Uses ontology to extract true intent
- **Result**: LLM now understands snowboarding context
