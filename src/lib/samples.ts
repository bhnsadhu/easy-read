// One-click sample readings for demos. Dense on purpose, with dates,
// numbers, and names so Fact Guard has facts to verify.
export type Sample = { id: string; label: string; subject: string; title: string; text: string };

export const SAMPLES: Sample[] = [
  {
    id: "science",
    label: "Science article",
    subject: "7th grade science",
    title: "Photosynthesis: how plants make food",
    text: `Photosynthesis: how plants make food

Photosynthesis is the biochemical process by which plants, algae, and certain bacteria utilize the energy of sunlight in order to synthesize carbohydrates from carbon dioxide and water, releasing oxygen as a byproduct. The process occurs within specialized organelles called chloroplasts, which contain the green pigment chlorophyll, which is responsible for absorbing energy from blue and red light waves while reflecting green light waves, making the plant appear green.

Although there are numerous steps behind the process, it can be broken down into two major stages: the light-dependent reactions and the light-independent reactions. The light-dependent reaction takes place within the thylakoid membrane and requires a steady stream of sunlight, hence the name light-dependent reaction. The light-independent stage, which is also known as the Calvin cycle, takes place in the stroma and does not require light directly.

In 1779, the Dutch physician Jan Ingenhousz demonstrated that plants release oxygen only when they are exposed to light, building on the earlier experiments of Joseph Priestley in 1771. Today scientists estimate that approximately 21% of the atmosphere consists of oxygen, and that nearly all of it originated from photosynthesis. A single large tree is capable of producing approximately 2,400 kilograms of oxygen in a year, which is sufficient for two people.

Photosynthesis requires three essential ingredients: sunlight, water, and carbon dioxide. Without photosynthesis, animals and humans would possess neither food nor oxygen, and consequently the planet would be uninhabitable.`,
  },
  {
    id: "history",
    label: "History passage",
    subject: "8th grade social studies",
    title: "The Dust Bowl",
    text: `The Dust Bowl

During the 1930s, a prolonged period of severe drought, in combination with decades of intensive farming practices that had removed the native grasses which anchored the topsoil, resulted in enormous dust storms across the southern Great Plains of the United States. The region most severely affected encompassed approximately 100 million acres, including portions of Texas, Oklahoma, Kansas, Colorado, and New Mexico.

The largest storm occurred on April 14, 1935, a day which subsequently became known as Black Sunday. Winds exceeding 60 miles per hour transported an estimated 300,000 tons of topsoil, and visibility in numerous towns was reduced to a few feet. The journalist Robert Geiger, reporting for the Associated Press, utilized the phrase "dust bowl" the following day, and the name endured.

The economic consequences were substantial. Approximately 2.5 million individuals departed the Plains states between 1930 and 1940, which constituted the largest migration in American history up to that point. Many of the migrants relocated to California in order to seek agricultural employment.

In response, the federal government established the Soil Conservation Service in 1935 under the direction of Hugh Hammond Bennett. The agency promoted techniques including contour plowing, crop rotation, and the planting of shelterbelts, which are rows of trees intended to reduce wind velocity. By 1938, these measures had reduced the quantity of blowing soil by approximately 65 percent.`,
  },
  {
    id: "assignment",
    label: "Lab assignment",
    subject: "6th grade science",
    title: "Lab: measuring the speed of a toy car",
    text: `Lab: measuring the speed of a toy car

In this investigation you will determine the average speed of a toy car as it travels down a ramp, and you will subsequently analyze how the height of the ramp influences that speed. Prior to commencing the procedure, ensure that you have obtained the following materials: one toy car, one wooden ramp of approximately 1 meter in length, a stack of textbooks, a meter stick, a stopwatch, and your lab notebook.

Instructions:
1. Position the ramp so that one end rests on a single textbook, which is approximately 3 centimeters high, and the other end rests on the floor.
2. Utilize the meter stick in order to measure the distance from the top of the ramp to the bottom, and record this measurement in centimeters in your notebook.
3. Release the car from the top of the ramp without pushing it, and simultaneously start the stopwatch; stop the stopwatch at the moment the car reaches the bottom.
4. Repeat the trial three times, and calculate the average time.
5. Add one additional textbook beneath the ramp, and repeat steps 2 through 4 until you have collected data for four different heights.

Calculate the average speed for each height by dividing the distance by the average time. Construct a graph with ramp height on the horizontal axis and average speed on the vertical axis. In a paragraph of at least five sentences, explain the relationship that you observed, and propose a hypothesis regarding why the relationship exists. Submit your notebook pages and your graph at the beginning of the next class.`,
  },
  {
    id: "news",
    label: "News article",
    subject: "9th grade English",
    title: "Library opens a tool-lending shelf",
    text: `Library opens a tool-lending shelf

The Riverside Public Library announced on Tuesday that it has established a tool-lending collection, which will permit cardholders to borrow household and gardening equipment in the same manner that they currently borrow books. The collection, which was assembled over approximately eight months with a $42,000 grant from the Harmon Foundation, consists of 310 items, including drills, ladders, sewing machines, and a 3D printer.

Library director Priya Raman stated that the initiative originated from a 2024 community survey in which 61 percent of respondents indicated that the cost of tools prevented them from completing home repairs. "A ladder that you utilize twice a year does not need to live in your garage," Raman said, adding that each item can be borrowed for a period of seven days and renewed once.

The library anticipates approximately 1,500 loans during the first year, and it has designated Saturday mornings for demonstrations conducted by volunteers. Items are required to be returned to the main branch on Elm Street, which is open from 9 a.m. to 8 p.m. on weekdays. Cardholders who are under the age of 16 must be accompanied by an adult in order to borrow power tools.`,
  },
];

export function getSample(id: string): Sample {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0]!;
}
