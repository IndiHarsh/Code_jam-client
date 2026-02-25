import { useEffect, useRef } from "react";
import p5 from "p5";

/**
 * Interactive force-field particle background.
 * Particles form from a subtle grid and react to the mouse (repulsion).
 * Adapted for CodeJam's #1313ec blue palette.
 *
 * Props:
 *   hue       – HSL hue (default 234, the blue of #1313ec)
 *   saturation – HSL saturation (default 90)
 *   spacing   – grid spacing in px (default 14)
 *   style     – extra CSS for the container div
 */
export default function ForceField({
    hue = 234,
    saturation = 90,
    spacing = 14,
    style = {},
}) {
    const containerRef = useRef(null);
    const sketchRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const sketch = (p) => {
            let points = [];
            let palette = [];
            let mX = 0, mY = 0;

            const params = {
                hue, saturation, spacing,
                magnifierRadius: 160,
                forceStrength: 14,
                friction: 0.92,
                restoreSpeed: 0.05,
                minStroke: 1.2,
                maxStroke: 4,
            };

            function generatePalette() {
                palette = [];
                for (let i = 0; i < 12; i++) {
                    const l = p.map(i, 0, 11, 80, 8);
                    palette.push(p.color(params.hue, params.saturation, l));
                }
            }

            function generatePoints() {
                points = [];
                const sp = params.spacing;
                for (let y = 0; y < p.height; y += sp) {
                    for (let x = 0; x < p.width; x += sp) {
                        // Subtle noise-based brightness for organic look
                        const noiseVal = p.noise(x * 0.003, y * 0.003);
                        points.push({
                            pos: p.createVector(x, y),
                            origin: p.createVector(x, y),
                            vel: p.createVector(0, 0),
                            bright: noiseVal, // 0–1
                        });
                    }
                }
            }

            p.setup = () => {
                const el = containerRef.current;
                const canvas = p.createCanvas(el.clientWidth, el.clientHeight);
                canvas.parent(el);
                p.colorMode(p.HSL);
                mX = p.width / 2;
                mY = p.height / 2;
                generatePalette();
                generatePoints();
            };

            p.draw = () => {
                p.background(0);
                mX = p.lerp(mX, p.mouseX, 0.08);
                mY = p.lerp(mY, p.mouseY, 0.08);
                p.noFill();

                for (const pt of points) {
                    const d = p.dist(pt.pos.x, pt.pos.y, mX, mY);

                    // Repulsion
                    if (d < params.magnifierRadius) {
                        const dir = p5.Vector.sub(pt.pos, p.createVector(mX, mY));
                        dir.normalize();
                        const f = dir.mult(params.forceStrength * p.map(d, 0, params.magnifierRadius, 1, 0));
                        pt.vel.add(f);
                    }

                    // Restore
                    const restore = p5.Vector.sub(pt.origin, pt.pos).mult(params.restoreSpeed);
                    pt.vel.add(restore);
                    pt.vel.mult(params.friction);
                    pt.pos.add(pt.vel);

                    // Only draw if brightness passes threshold (creates organic gaps)
                    if (pt.bright < 0.88) {
                        const shadeIdx = p.floor(p.map(pt.bright, 0, 1, 0, palette.length - 1));
                        let sw = p.map(pt.bright, 0, 1, params.minStroke, params.maxStroke);
                        if (d < params.magnifierRadius) {
                            sw *= p.map(d, 0, params.magnifierRadius, 1.8, 1);
                        }
                        p.stroke(palette[p.constrain(shadeIdx, 0, palette.length - 1)]);
                        p.strokeWeight(sw);
                        p.point(pt.pos.x, pt.pos.y);
                    }
                }
            };

            p.windowResized = () => {
                const el = containerRef.current;
                if (!el) return;
                p.resizeCanvas(el.clientWidth, el.clientHeight);
                generatePoints();
            };
        };

        sketchRef.current = new p5(sketch);

        return () => {
            sketchRef.current?.remove();
            sketchRef.current = null;
        };
    }, [hue, saturation, spacing]);

    return (
        <div
            ref={containerRef}
            style={{
                position: "fixed", inset: 0, zIndex: 0,
                pointerEvents: "auto",
                ...style,
            }}
        />
    );
}
