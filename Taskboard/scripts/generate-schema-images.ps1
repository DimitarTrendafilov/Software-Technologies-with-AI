Add-Type -AssemblyName System.Drawing

function New-DbPng {
  param(
    [string]$Path,
    [string]$Title,
    [array]$Boxes,
    [array]$Edges,
    [System.Drawing.Color]$FillColor,
    [System.Drawing.Color]$StrokeColor
  )

  $bitmap = New-Object System.Drawing.Bitmap 1200, 700
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::White)

  $titleFont = New-Object System.Drawing.Font('Arial', 22, [System.Drawing.FontStyle]::Bold)
  $textFont = New-Object System.Drawing.Font('Arial', 12, [System.Drawing.FontStyle]::Bold)
  $edgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(75, 85, 99), 2)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(17, 24, 39))
  $nodeBrush = New-Object System.Drawing.SolidBrush($FillColor)
  $nodePen = New-Object System.Drawing.Pen($StrokeColor, 2)

  $graphics.DrawString($Title, $titleFont, $textBrush, 20, 20)

  $positions = @{}
  foreach ($box in $Boxes) {
    $name = $box.name
    $x = [int]$box.x
    $y = [int]$box.y
    $w = [int]$box.w
    $h = [int]$box.h

    $positions[$name] = @{ x = $x; y = $y; w = $w; h = $h }
    $graphics.FillRectangle($nodeBrush, $x, $y, $w, $h)
    $graphics.DrawRectangle($nodePen, $x, $y, $w, $h)
    $graphics.DrawString($name, $textFont, $textBrush, $x + 10, $y + 16)
  }

  foreach ($edge in $Edges) {
    $from = $positions[$edge.from]
    $to = $positions[$edge.to]

    $x1 = [int]($from.x + $from.w)
    $y1 = [int]($from.y + ($from.h / 2))
    $x2 = [int]$to.x
    $y2 = [int]($to.y + ($to.h / 2))
    $graphics.DrawLine($edgePen, $x1, $y1, $x2, $y2)
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
  $titleFont.Dispose()
  $textFont.Dispose()
  $edgePen.Dispose()
  $textBrush.Dispose()
  $nodeBrush.Dispose()
  $nodePen.Dispose()
}

$projectBoxes = @(
  @{ name = 'projects'; x = 40; y = 90; w = 180; h = 52 },
  @{ name = 'project_stages'; x = 300; y = 90; w = 220; h = 52 },
  @{ name = 'tasks'; x = 600; y = 90; w = 140; h = 52 },
  @{ name = 'project_members'; x = 40; y = 220; w = 220; h = 52 },
  @{ name = 'labels'; x = 300; y = 220; w = 120; h = 52 },
  @{ name = 'task_labels'; x = 500; y = 220; w = 170; h = 52 },
  @{ name = 'task_comments'; x = 40; y = 350; w = 180; h = 52 },
  @{ name = 'task_checklist_items'; x = 260; y = 350; w = 230; h = 52 },
  @{ name = 'task_attachments'; x = 530; y = 350; w = 190; h = 52 },
  @{ name = 'task_activity'; x = 760; y = 350; w = 150; h = 52 }
)

$projectEdges = @(
  @{ from = 'projects'; to = 'project_stages' },
  @{ from = 'project_stages'; to = 'tasks' },
  @{ from = 'projects'; to = 'project_members' },
  @{ from = 'projects'; to = 'labels' },
  @{ from = 'tasks'; to = 'task_labels' },
  @{ from = 'labels'; to = 'task_labels' },
  @{ from = 'tasks'; to = 'task_comments' },
  @{ from = 'tasks'; to = 'task_checklist_items' },
  @{ from = 'tasks'; to = 'task_attachments' },
  @{ from = 'tasks'; to = 'task_activity' }
)

$boardBoxes = @(
  @{ name = 'boards'; x = 40; y = 100; w = 160; h = 52 },
  @{ name = 'memberships'; x = 290; y = 100; w = 170; h = 52 },
  @{ name = 'lists'; x = 290; y = 210; w = 120; h = 52 },
  @{ name = 'cards'; x = 500; y = 210; w = 120; h = 52 },
  @{ name = 'labels'; x = 290; y = 320; w = 120; h = 52 },
  @{ name = 'card_labels'; x = 500; y = 320; w = 160; h = 52 },
  @{ name = 'comments'; x = 740; y = 210; w = 150; h = 52 },
  @{ name = 'activity_events'; x = 740; y = 100; w = 180; h = 52 }
)

$boardEdges = @(
  @{ from = 'boards'; to = 'memberships' },
  @{ from = 'boards'; to = 'lists' },
  @{ from = 'lists'; to = 'cards' },
  @{ from = 'boards'; to = 'labels' },
  @{ from = 'cards'; to = 'card_labels' },
  @{ from = 'labels'; to = 'card_labels' },
  @{ from = 'cards'; to = 'comments' },
  @{ from = 'boards'; to = 'activity_events' }
)

New-DbPng -Path 'docs/schema-project-centric.png' -Title 'Taskboard Schema A: Project-Centric' -Boxes $projectBoxes -Edges $projectEdges -FillColor ([System.Drawing.Color]::FromArgb(238, 242, 255)) -StrokeColor ([System.Drawing.Color]::FromArgb(99, 102, 241))
New-DbPng -Path 'docs/schema-board-centric.png' -Title 'Taskboard Schema B: Board-Centric' -Boxes $boardBoxes -Edges $boardEdges -FillColor ([System.Drawing.Color]::FromArgb(236, 254, 255)) -StrokeColor ([System.Drawing.Color]::FromArgb(8, 145, 178))

Write-Output 'Generated docs/schema-project-centric.png and docs/schema-board-centric.png'