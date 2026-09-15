# Texturas sueltas (opcional)

Normalmente las texturas van **incrustadas dentro del `.glb`**, así que no
necesitas nada en esta carpeta. Úsala solo si quieres texturas externas.

## Convención de nombres

```
<categoria>/<nombre>_albedo.png     -> color base (map)
<categoria>/<nombre>_normal.png     -> mapa de normales
<categoria>/<nombre>_roughness.png  -> rugosidad
<categoria>/<nombre>_metalness.png  -> metalicidad
```

Ejemplos:

```
public/assets/textures/pcb_albedo.png
public/assets/textures/pcb_normal.png
public/assets/textures/metal_rougness.png
```

## Cómo asignarlas a un componente

En `src/data/components.ts`, añade el campo `texture` al componente:

```ts
{
  id: 'gpu',
  // ...
  texture: '/assets/textures/gpu_albedo.png',
}
```

## Especificaciones

- Formato: PNG o JPG. Se prefieren texturas **PBR**.
- Tamaño: potencia de 2 (512, 1024, 2048).
- Archivos pequeños (< 2 MB) para que cargue rápido en el aula.
