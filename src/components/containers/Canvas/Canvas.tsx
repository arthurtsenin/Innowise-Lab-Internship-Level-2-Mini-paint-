import React, { useEffect, useRef, useState } from 'react'
import { useTypedDispatch } from '@/hooks/useTypedDispatch'
import { useTypedSelector } from '@/hooks/useTypedSelector'
import { changePrevPosition, toolIsDrawing } from '@/store/slice/toolSlice'
import { showSuccessCanvas } from '@/components/views/toasts/showSuccessCanvas'
import { showErrorCanvas } from '@/components/views/toasts/showErroeCanvas'
import { writePaintingsToDataBase } from '@/api/dbHelper'
import { CANVAS_SIZE } from '@/constants/canvas'
import { TOOLS } from '@/constants/canvas'
import {
  drawCircle,
  drawRect,
  drawTriangle,
  drawLine,
  drawStar,
  drawHexagon,
} from './utils/figures'
import { ISnapshot } from '@/types/types'
import SaveIcon from '@mui/icons-material/Save'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import Button from '@mui/material/Button'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { CanvasContainer, ButtonsContainer, CanvasWrapper } from './Canvas.styles'

export const Canvas = () => {
  const dispatch = useTypedDispatch()
  const user = useTypedSelector((state) => state.user.user)
  const { tool, color, lineThickness, isDrawing, fillColor, prevPosition } = useTypedSelector(
    (state) => state.tool,
  )
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [snapshot, setSnapshot] = useState<ISnapshot>({
    data: new Uint8ClampedArray(0),
    colorSpace: 'srgb',
    height: 400,
    width: 700,
  })
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d', {
        willReadFrequently: true,
      })
      contextRef.current = context
    }
  })

  const clear = () => {
    const ctx = contextRef.current
    ctx!.clearRect(0, 0, ctx!.canvas.width, ctx!.canvas.height)
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dispatch(toolIsDrawing(true))
    const ctx = contextRef.current
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    ctx!.beginPath()
    ctx!.lineWidth = lineThickness
    ctx!.strokeStyle = color
    ctx!.fillStyle = color
    setSnapshot(ctx!.getImageData(0, 0, ctx!.canvas.width, ctx!.canvas.height))
    dispatch(changePrevPosition({ x, y }))
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = contextRef.current
    if (!isDrawing) return
    ctx!.putImageData(snapshot, 0, 0)

    switch (tool) {
      case TOOLS.eraser.name:
        ctx!.strokeStyle = tool === TOOLS.eraser.name ? '#fff' : color
        ctx!.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        ctx!.stroke()
        break
      case TOOLS.rectangle.name:
        drawRect(e, fillColor, ctx, prevPosition)
        break
      case TOOLS.circle.name:
        drawCircle(e, fillColor, ctx, prevPosition)
        break
      case TOOLS.triangle.name:
        drawTriangle(e, fillColor, ctx, prevPosition)
        break
      case TOOLS.line.name:
        drawLine(e, ctx, prevPosition)
        break
      case TOOLS.star.name:
        drawStar(e, fillColor, ctx, prevPosition)
        break
      case TOOLS.hexagon.name:
        drawHexagon(e, fillColor, ctx, prevPosition)
        break
      default:
        ctx!.strokeStyle = tool === TOOLS.eraser.name ? '#fff' : tool
        ctx!.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        ctx!.stroke()
        break
    }
  }

  const onMouseUp = () => {
    dispatch(toolIsDrawing(false))
  }

  const downloadPainting = async () => {
    const image = canvasRef!.current!.toDataURL('image/png')
    const blob = await (await fetch(image)).blob()
    const blobURL = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobURL
    link.download = 'image.png'
    link.click()
  }

  const writeToDatabase = async () => {
    const ctx = contextRef.current
    try {
      await writePaintingsToDataBase(user, ctx)
      showSuccessCanvas()
    } catch (e) {
      setError((e as Error).message)
      showErrorCanvas(error)
    }
  }

  return (
    <CanvasContainer>
      <ButtonsContainer>
        <Button variant="contained" color="info" onClick={clear}>
          <DeleteForeverIcon />
        </Button>
        <Button sx={{ m: 1 }} variant="contained" color="info" onClick={writeToDatabase}>
          <BookmarkIcon />
        </Button>
        <Button variant="contained" color="info" onClick={downloadPainting}>
          <SaveIcon />
        </Button>
      </ButtonsContainer>
      <CanvasWrapper
        width={CANVAS_SIZE.with}
        height={CANVAS_SIZE.height}
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
    </CanvasContainer>
  )
}