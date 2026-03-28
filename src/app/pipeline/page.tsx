import { Header } from "@/components/nav/header";
import { KanbanColumn } from "@/components/ui/kanban-column";
import { ProjectCard } from "@/components/pipeline/project-card";

const PIPELINE_DATA = {
  "Initial Contact": [
    {
      id: "ic-1",
      company: "星际科技",
      founder: "王浩然",
      health: "on-track" as const,
      assignee: "Arthur",
      daysInStage: 3,
      tags: ["AI", "B2B"],
    },
    {
      id: "ic-2",
      company: "云端医疗",
      founder: "李晓梅",
      health: "needs-attention" as const,
      assignee: "Sarah",
      daysInStage: 8,
      tags: ["HealthTech"],
    },
    {
      id: "ic-3",
      company: "绿能智慧",
      founder: "陈志远",
      health: "on-track" as const,
      assignee: "Arthur",
      daysInStage: 2,
      tags: ["CleanTech", "IoT"],
    },
  ],
  "Due Diligence": [
    {
      id: "dd-1",
      company: "数字物流",
      founder: "张思琪",
      health: "on-track" as const,
      assignee: "Michael",
      daysInStage: 14,
      tags: ["Logistics", "SaaS"],
    },
    {
      id: "dd-2",
      company: "智链金融",
      founder: "刘建国",
      health: "at-risk" as const,
      assignee: "Sarah",
      daysInStage: 21,
      tags: ["FinTech"],
    },
  ],
  "Investment Decision": [
    {
      id: "id-1",
      company: "慧眼视觉",
      founder: "吴雅静",
      health: "on-track" as const,
      assignee: "Arthur",
      daysInStage: 7,
      tags: ["Computer Vision", "AI"],
    },
  ],
  "Acceleration": [
    {
      id: "ac-1",
      company: "聚合教育",
      founder: "赵明宇",
      health: "on-track" as const,
      assignee: "Michael",
      daysInStage: 45,
      tags: ["EdTech"],
    },
    {
      id: "ac-2",
      company: "碳索能源",
      founder: "孙丽华",
      health: "needs-attention" as const,
      assignee: "Sarah",
      daysInStage: 60,
      tags: ["CleanTech"],
    },
    {
      id: "ac-3",
      company: "瞰云出行",
      founder: "周天翔",
      health: "overdue" as const,
      assignee: "Arthur",
      daysInStage: 90,
      tags: ["Mobility", "AI"],
    },
  ],
  "Exit": [
    {
      id: "ex-1",
      company: "融合网络",
      founder: "郑晨光",
      health: "on-track" as const,
      assignee: "Michael",
      daysInStage: 12,
      tags: ["Networking"],
    },
  ],
} as const;

export default function PipelinePage() {
  return (
    <div>
      <Header title="Pipeline" description="Track portfolio companies through the accelerator stages" />
      <div className="flex gap-6 overflow-x-auto pb-4">
        {Object.entries(PIPELINE_DATA).map(([stage, projects]) => (
          <KanbanColumn key={stage} title={stage} count={projects.length}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                company={project.company}
                founder={project.founder}
                health={project.health}
                assignee={project.assignee}
                daysInStage={project.daysInStage}
                tags={[...project.tags]}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </div>
  );
}
