import { Breadcrumb } from 'antd'

interface BreadcrumbHeaderProps {
  items: string[]
}

export function BreadcrumbHeader({ items }: BreadcrumbHeaderProps) {
  return (
    <Breadcrumb
      className="breadcrumb-header"
      items={items.map((item, index) => ({
        title: index === items.length - 1 ? <span>{item}</span> : item,
      }))}
    />
  )
}
