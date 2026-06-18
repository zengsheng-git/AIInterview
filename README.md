# AI 模拟面试系统

基于 **React + NestJS + LangGraph + MiniMax** 的智能模拟面试系统。

## ✨ 核心功能

- 📋 **JD 解析**: 粘贴岗位 JD，自动提取核心技能点和考察重点
- 📄 **简历对齐**: 上传简历，AI 分析匹配度与差距，预测压力面问题
- 🎤 **模拟面试**:
  - 单轮练习 / 多轮深度追问（2-3 层）
  - 练习模式（边答边提示） / 严格模式（结束统一评估）
  - 打字机效果 + Web Speech API 语音输入
- 📊 **评估与复盘**: 雷达图（基础/项目/系统设计/沟通）+ 改进建议

## 🛠 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + ECharts + TailwindCSS |
| 后端 | NestJS 10 + Prisma + SQLite + LangGraph.js |
| 大模型 | MiniMax（OpenAI 兼容协议） |
| Agent | LangGraph.js（SqliteSaver 检查点） |
| 实时通信 | SSE（Server-Sent Events） |

## 📂 项目结构

```
AIInterview/
├── data/                  # SQLite 数据库文件目录
├── backend/               # NestJS 后端
├── frontend/              # React 前端
└── package.json           # 根启动脚本
```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm run install:all
```

### 2. 配置环境变量
```bash
# 后端
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 MINIMAX_API_KEY

# 前端
cp frontend/.env.example frontend/.env
```

### 3. 初始化数据库
```bash
npm run prisma:migrate
```

### 4. 一键启动
```bash
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3001/api
- Prisma Studio: `npm run prisma:studio`

## 📝 开发路线

- [x] **P1**: 项目骨架
- [ ] **P2**: 数据层 + 简历解析
- [ ] **P3**: LLM 接入 + JD 解析 Agent
- [ ] **P4**: 模拟面试核心（状态机 + SSE）
- [ ] **P5**: 评估报告 + 雷达图
- [ ] **P6**: 体验打磨
