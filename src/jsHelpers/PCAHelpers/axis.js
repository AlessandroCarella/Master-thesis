export function createAxes(g, x, y, margin, width, height) {
    // X-axis
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(10))
        .call((g) => g.select(".domain").remove()) // Remove axis line
        .call((g) => g.selectAll(".tick line").remove()); // Remove tick lines

    // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(10))
        .call((g) => g.select(".domain").remove()) // Remove axis line
        .call((g) => g.selectAll(".tick line").remove()); // Remove tick lines
}
