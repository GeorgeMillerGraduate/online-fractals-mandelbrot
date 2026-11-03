class GradientEditor {

    constructor() {

        this.preview = document.getElementById("gradientPreview");
        this.positionInput = document.getElementById('gradientPosition');
        this.positionInput?.addEventListener('input', () => {
            if (!this.selectedStop) return;
            const value = Number(this.positionInput.value);
            if (!Number.isFinite(value)) return;
            this.selectedStop.position = Math.max(0, Math.min(1, value));
            this.update();
        });
        this.stopsContainer = document.getElementById("gradientStops");
        this.colourInput = document.getElementById("gradientColour");

        this.addButton = document.getElementById("addColourButton");
        this.removeButton = document.getElementById("removeColourButton");
        this.reverseButton = document.getElementById("reverseGradientButton");
        this.resetButton = document.getElementById("resetGradientButton");

        /*
         * Default Mandelbrot colour palette.
         *
         * Positions are normalised from 0.0 to 1.0.
         */
        this.defaultStops = [
            { position: 0.00, colour: "#00086A" },
            { position: 0.25, colour: "#378BDA" },
            { position: 0.50, colour: "#F6FBE1" },
            { position: 0.75, colour: "#FDA000" },
            { position: 1.00, colour: "#00086A" }
        ];

        this.stops = [];

        this.selectedStop = null;

        this.dragging = false;
        this.draggedStop = null;

        this.onGradientChanged = null;

        this.reset();

        this.bindEvents();
    }


    /* =====================================================
       Event setup
       ===================================================== */

    bindEvents() {

        this.colourInput.addEventListener("input", () => {

            if (!this.selectedStop) {
                return;
            }

            this.selectedStop.colour = this.colourInput.value;

            this.update();
        });


        this.addButton.addEventListener("click", () => {
            this.addStop();
        });


        this.removeButton.addEventListener("click", () => {
            this.removeSelectedStop();
        });


        this.reverseButton.addEventListener("click", () => {
            this.reverse();
        });


        this.resetButton.addEventListener("click", () => {
            this.reset();
        });


        /*
         * Mouse movement is attached to the document rather
         * than the individual stop.
         *
         * This means dragging continues to work if the mouse
         * moves slightly outside the gradient control.
         */

        document.addEventListener("mousemove", (event) => {

            if (!this.dragging || !this.draggedStop) {
                return;
            }

            this.dragStop(event);
        });


        document.addEventListener("mouseup", () => {

            if (!this.dragging) {
                return;
            }

            this.dragging = false;
            this.draggedStop = null;

            this.sortStops();

            this.update();
        });
    }


    /* =====================================================
       Reset
       ===================================================== */

    reset() {

        this.stops = this.defaultStops.map(stop => ({
            position: stop.position,
            colour: stop.colour
        }));

        this.selectedStop = this.stops[0];

        this.update();
    }


    /* =====================================================
       Add colour
       ===================================================== */

    addStop() {

        let position = 0.5;

        /*
         * If a stop is selected, insert the new stop halfway
         * between it and the next stop.
         */

        if (this.selectedStop) {

            this.sortStops();

            const index = this.stops.indexOf(this.selectedStop);

            if (index >= 0 && index < this.stops.length - 1) {

                const next = this.stops[index + 1];

                position =
                    (this.selectedStop.position + next.position) / 2;

            } else if (index > 0) {

                const previous = this.stops[index - 1];

                position =
                    (previous.position + this.selectedStop.position) / 2;
            }
        }


        /*
         * Use the colour currently visible at this point in
         * the gradient rather than adding an arbitrary colour.
         */

        const colour = this.getInterpolatedColour(position);


        const stop = {
            position: position,
            colour: colour
        };


        this.stops.push(stop);

        this.sortStops();

        this.selectedStop = stop;

        this.update();
    }


    /* =====================================================
       Remove colour
       ===================================================== */

    removeSelectedStop() {

        if (!this.selectedStop) {
            return;
        }


        /*
         * Always retain at least two stops.
         */

        if (this.stops.length <= 2) {
            return;
        }


        const index = this.stops.indexOf(this.selectedStop);

        if (index === -1) {
            return;
        }


        this.stops.splice(index, 1);


        if (this.stops.length > 0) {

            const newIndex = Math.min(
                index,
                this.stops.length - 1
            );

            this.selectedStop = this.stops[newIndex];

        } else {

            this.selectedStop = null;
        }


        this.update();
    }


    /* =====================================================
       Reverse gradient
       ===================================================== */

    reverse() {

        for (const stop of this.stops) {

            stop.position = 1.0 - stop.position;
        }


        this.sortStops();

        this.update();
    }


    /* =====================================================
       Stop dragging
       ===================================================== */

    startDrag(event, stop) {

        event.preventDefault();

        this.selectStop(stop);

        this.dragging = true;
        this.draggedStop = stop;
    }


    dragStop(event) {

        const rect =
            this.stopsContainer.getBoundingClientRect();


        let x =
            event.clientX - rect.left;


        let position =
            x / rect.width;


        position = Math.max(
            0.0,
            Math.min(1.0, position)
        );


        this.draggedStop.position = position;

        this.sortStops();

        this.update();
    }


    /* =====================================================
       Select stop
       ===================================================== */

    selectStop(stop) {

        this.selectedStop = stop;

        this.colourInput.value = stop.colour;
        if (this.positionInput) this.positionInput.value = String(stop.position);

        this.renderStops();
    }


    /* =====================================================
       Sort
       ===================================================== */

    sortStops() {

        this.stops.sort(
            (a, b) => a.position - b.position
        );
    }


    /* =====================================================
       Update entire editor
       ===================================================== */

    update() {

        this.sortStops();
        if (this.positionInput && this.selectedStop) this.positionInput.value = String(this.selectedStop.position);

        this.renderGradient();
        this.renderStops();

        if (this.selectedStop) {

            this.colourInput.value =
                this.selectedStop.colour;
        }


        /*
         * Later the renderer can register a callback here.
         *
         * Changing the gradient will then recolour the
         * Mandelbrot image without recalculating iterations.
         */

        if (typeof this.onGradientChanged === "function") {

            this.onGradientChanged(
                this.getStops()
            );
        }
    }


    /* =====================================================
       Render gradient preview
       ===================================================== */

    renderGradient() {

        const parts = this.stops.map(stop => {

            const percentage =
                stop.position * 100;

            return `${stop.colour} ${percentage}%`;
        });


        this.preview.style.background =
            `linear-gradient(90deg, ${parts.join(", ")})`;
    }


    /* =====================================================
       Render draggable stops
       ===================================================== */

    renderStops() {

        this.stopsContainer.innerHTML = "";


        for (const stop of this.stops) {

            const button =
                document.createElement("button");


            button.type = "button";
            button.setAttribute("aria-label", `Colour stop at ${Math.round(stop.position * 100)} percent`);

            button.className =
                "gradient-stop";


            if (stop === this.selectedStop) {

                button.classList.add(
                    "gradient-stop-selected"
                );
            }


            button.style.left =
                `${stop.position * 100}%`;


            const colour =
                document.createElement("span");


            colour.className =
                "gradient-stop-colour";


            colour.style.background =
                stop.colour;


            button.appendChild(colour);


            button.addEventListener(
                "mousedown",
                (event) => {

                    this.startDrag(
                        event,
                        stop
                    );
                }
            );


            button.addEventListener(
                "click",
                () => {

                    this.selectStop(stop);
                }
            );


            this.stopsContainer.appendChild(
                button
            );
        }
    }


    /* =====================================================
       Linear colour interpolation
       ===================================================== */

    getInterpolatedColour(position) {

        this.sortStops();


        if (position <= this.stops[0].position) {

            return this.stops[0].colour;
        }


        const last =
            this.stops[this.stops.length - 1];


        if (position >= last.position) {

            return last.colour;
        }


        for (
            let i = 0;
            i < this.stops.length - 1;
            i++
        ) {

            const left =
                this.stops[i];

            const right =
                this.stops[i + 1];


            if (
                position >= left.position &&
                position <= right.position
            ) {

                const range =
                    right.position - left.position;


                const t =
                    range === 0
                        ? 0
                        : (position - left.position) / range;


                return this.interpolateHex(
                    left.colour,
                    right.colour,
                    t
                );
            }
        }


        return "#000000";
    }


    /* =====================================================
       Hex interpolation
       ===================================================== */

    interpolateHex(colourA, colourB, t) {

        const a =
            this.hexToRGB(colourA);

        const b =
            this.hexToRGB(colourB);


        const r = Math.round(
            a.r + (b.r - a.r) * t
        );

        const g = Math.round(
            a.g + (b.g - a.g) * t
        );

        const blue = Math.round(
            a.b + (b.b - a.b) * t
        );


        return this.rgbToHex(
            r,
            g,
            blue
        );
    }


    /* =====================================================
       Hex -> RGB
       ===================================================== */

    hexToRGB(hex) {

        const value =
            hex.replace("#", "");


        return {

            r: parseInt(
                value.substring(0, 2),
                16
            ),

            g: parseInt(
                value.substring(2, 4),
                16
            ),

            b: parseInt(
                value.substring(4, 6),
                16
            )
        };
    }


    /* =====================================================
       RGB -> Hex
       ===================================================== */

    rgbToHex(r, g, b) {

        const componentToHex = value => {

            return value
                .toString(16)
                .padStart(2, "0");
        };


        return (
            "#" +
            componentToHex(r) +
            componentToHex(g) +
            componentToHex(b)
        ).toUpperCase();
    }


    /* =====================================================
       Public API
       ===================================================== */

    getStops() {

        return this.stops.map(stop => ({
            position: stop.position,
            colour: stop.colour
        }));
    }


    setGradientChangedListener(callback) {

        this.onGradientChanged = callback;
    }
}