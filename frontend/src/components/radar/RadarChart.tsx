import ReactECharts from 'echarts-for-react'

export function RadarChart({ scores, height = 280 }: {
  scores: {
    basic: number
    project: number
    systemDesign: number
    communication: number
  }
  height?: number
}) {
  const option = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '基础知识', max: 100 },
        { name: '项目经验', max: 100 },
        { name: '系统设计', max: 100 },
        { name: '沟通表达', max: 100 },
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: '#4b5563',
        fontSize: 13,
      },
      splitLine: {
        lineStyle: { color: '#e5e7eb' },
      },
      splitArea: {
        areaStyle: { color: ['rgba(59,130,246,0.02)', 'rgba(59,130,246,0.05)'] },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [scores.basic, scores.project, scores.systemDesign, scores.communication],
            name: '能力评估',
            areaStyle: { color: 'rgba(59,130,246,0.25)' },
            lineStyle: { color: '#3b82f6', width: 2 },
            itemStyle: { color: '#3b82f6' },
          },
        ],
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
    />
  )
}
