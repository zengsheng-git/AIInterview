import { ReactNode } from 'react'

export function SplitLayout({ left, right, leftWidth = '60%' }: {
  left: ReactNode
  right: ReactNode
  leftWidth?: string
}) {
  return (
    <div className="flex h-full" style={{ background: '#f5f7fa' }}>
      <div
        className="flex flex-col border-r border-gray-200 bg-white"
        style={{ width: leftWidth, minWidth: 480 }}
      >
        {left}
      </div>
      <div className="flex-1 overflow-y-auto p-4">{right}</div>
    </div>
  )
}
