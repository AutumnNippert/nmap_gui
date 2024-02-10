devices = [] // contains {hostname, ip, [ports_services], device info, nmap_result}

currentRowOpen = null;
currentExpandedRow = null;

// wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {

    var table = document.getElementById('nmap-table');

    table.addEventListener('click', function (e) {
        var target = e.target;

        if (target.nodeName === 'TH') {
            return;
        }

        while (target && target.nodeName !== 'TR') {
            target = target.parentElement;
        }

        if (target) {
            if (target == currentRowOpen) {
                currentExpandedRow.remove();
                currentRowOpen.classList.remove('selected');
                currentRowOpen = null;
                return;
            } else if (currentRowOpen) {
                currentRowOpen.classList.remove('selected');
                currentExpandedRow.remove();
            }

            var cells = target.getElementsByTagName('td');
            // get device from ip
            var ip = cells[1].innerHTML;
            // search for device in devices
            var device = findDeviceByIp(ip);
            var hostname = device.hostname;
            var ports = [];
            var services = [];
            for (var i = 0; i < device.ports_services.length; i++) {
                ports.push(device.ports_services[i].port);
                services.push(device.ports_services[i].service);
            }
            var nmapResult = device.nmap_result;

            // Create a new row and insert it after the clicked row
            var newRow = table.insertRow(target.rowIndex + 1);
            newRow.classList.add('expanded')
            currentRowOpen = target;
            target.classList.add('selected');
            currentExpandedRow = newRow;
            var newCell = newRow.insertCell(0);
            // Span the new cell across all columns
            newCell.colSpan = target.cells.length;
            // Populate the new cell with the nmap scan data
            newCell.innerHTML = `
                <pre><strong>Nmap Results:</strong> ${nmapResult}</pre>
            `;

            setTimeout(function () {
                newRow.classList.add('open');
            }, 0);
        }
    });

    var headers = table.getElementsByTagName('th');
    var sortDirection = 1;

    for (let i = 0; i < headers.length; i++) {
        headers[i].addEventListener('click', function () {
            var rows = Array.from(table.getElementsByTagName('tr')).slice(1); // Exclude the header row
            // Sort the rows based on the content of the corresponding cells
            if (sortDirection === 1) {
                rows.sort(function (rowA, rowB) {
                    var cellA = rowA.getElementsByTagName('td')[i].textContent;
                    var cellB = rowB.getElementsByTagName('td')[i].textContent;

                    return cellA.localeCompare(cellB);
                });
                // set the header text to indicate the sort direction
                // check if the header already has a sort direction indicator
                if (headers[i].innerHTML.includes('▼')) {
                    headers[i].innerHTML = headers[i].innerHTML.replace('▼', '▲');
                } else {
                    headers[i].innerHTML = headers[i].innerHTML + '▲';
                }
                // remove the sort direction indicator for the other headers
                for (let j = 0; j < headers.length; j++) {
                    if (j !== i) {
                        headers[j].innerHTML = headers[j].innerHTML.replace('▼', '').replace('▲', '');
                    }
                }

                sortDirection = -1;
            } else {
                rows.sort(function (rowA, rowB) {
                    var cellA = rowA.getElementsByTagName('td')[i].textContent;
                    var cellB = rowB.getElementsByTagName('td')[i].textContent;

                    return cellB.localeCompare(cellA);
                });
                // set the header text to indicate the sort direction
                // check if the header already has a sort direction indicator
                if (headers[i].innerHTML.includes('▲')) {
                    headers[i].innerHTML = headers[i].innerHTML.replace('▲', '▼');
                } else {
                    headers[i].innerHTML = headers[i].innerHTML + '▼';
                }
                // remove the sort direction indicator for the other headers
                for (let j = 0; j < headers.length; j++) {
                    if (j !== i) {
                        headers[j].innerHTML = headers[j].innerHTML.replace('▼', '').replace('▲', '');
                    }
                }

                sortDirection = 1;
            }


            // Remove the existing rows
            while (table.rows.length > 1) {
                table.deleteRow(1);
            }

            // Add the sorted rows
            for (let row of rows) {
                table.appendChild(row);
            }

        });
    }
});

//nmap 192.168.1.8 192.168.4.1 192.168.5.0/28 192.168.8.1 -F -sV
function parseNmapFile() {
    devices = [];
    // get get the FileList
    var files = document.getElementById('nmap-file').files;
    if (files.length <= 0) {
        console.log('No file selected');
        return false;
    }
    var fr = new FileReader();
    fr.onload = function (e) {

        // results of the file read
        var device = {}; // contains {hostname, ip, [ports_services], nmap_result}
        var text = e.target.result;

        // create xml parser
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(text, "text/xml");

        // get the host nodes
        var hosts = xmlDoc.getElementsByTagName('host');
        for (var i = 0; i < hosts.length; i++) {
            var host = hosts[i];
            var device = {};
            var ip = host.getElementsByTagName('address')[0].getAttribute('addr');
            var hostname = '';
            var ports_services = [];
            var device_info = '';
            var nmap_result = '';

            // get the status of the host
            var status = host.getElementsByTagName('status')[0].getAttribute('state');

            // get the hostnames
            var hostnames = host.getElementsByTagName('hostnames')[0];
            if (hostnames) {

                var hostnames = hostnames.getElementsByTagName('hostname');
                for (var j = 0; j < hostnames.length; j++) {
                    var name = hostnames[j].getAttribute('name');
                    hostname += name + ', ';
                }
            }

            // get the ports
            var ports = host.getElementsByTagName('ports')[0];
            if (ports) {
                var ports = ports.getElementsByTagName('port');
                for (var j = 0; j < ports.length; j++) {
                    var port = ports[j].getAttribute('portid');
                    var service = ports[j].getElementsByTagName('service')[0].getAttribute('name');
                    ports_services.push({ port: port, service: service });
                }
            }

            // get the os
            var os = host.getElementsByTagName('os')[0];
            if (os) {
                var osmatch = os.getElementsByTagName('osmatch')[0];
                if (osmatch) {
                    device_info = osmatch.getAttribute('name');
                }
            }

            // get the nmap result
            nmap_result = host.outerHTML;

            device.hostname = hostname;
            device.ip = ip;
            device.ports_services = ports_services;
            device.device_info = device_info;
            device.nmap_result = nmap_result;

            // if the device is not down, add it to the devices array
            if (status !== 'down')
                devices.push(device);
        }

        updateTable(devices);
    };
    fr.readAsText(files.item(0));
}

function outputTargets() {
    // output ips from devices
    var ips = [];
    for (var i = 0; i < devices.length; i++) {
        ips.push(devices[i].ip);
    }
    console.log(ips);
    // download the file
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ips.join('\n')));
    element.setAttribute('download', 'targets.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function updateTable() {
    console.log(devices)

    var hosts = [];
    var ips = [];
    var ports_services = [];
    var device_info = [];
    for (var i = 0; i < devices.length; i++) {
        hosts.push(devices[i].hostname);
        ips.push(devices[i].ip);
        ports_services.push(devices[i].ports_services);
        device_info.push(devices[i].device_info);
    }

    var table = document.getElementById('nmap-table');
    console.log("updating table with: ", hosts, ips, ports_services)

    // Clear the table, except for the header
    for (var i = table.rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }

    // Add the data
    for (var i = 0; i < ips.length; i++) {
        var row = table.insertRow(-1);
        // make this row darker
        var cell = row.insertCell(0);
        cell.innerHTML = hosts[i];
        cell = row.insertCell(1);
        cell.innerHTML = ips[i];

        text = '';
        for (var j = 0; j < ports_services[i].length; j++) {
            text += ports_services[i][j].port + '/' + ports_services[i][j].service + ', ';
        }
        cell = row.insertCell(2);
        cell.innerHTML = text;


        cell = row.insertCell(3);
        // device info
        cell.innerHTML = device_info[i];
    }
}

function findDeviceByIp(ip) {
    return devices.find(device => String(device.ip).trim() === String(ip).trim());
}

function deactivateSidebar() {
    var sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
    // sidebar.style.display = 'none';
}

function search() {
    // Get the value from the search input field
    var input = document.getElementById('search-input').value.toLowerCase();

    // Get the table rows
    var table = document.getElementById('nmap-table');
    var rows = table.getElementsByTagName('tr');

    // search by ip or name
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var ip = row.cells[1].innerHTML.toLowerCase();
        var name = row.cells[0].innerHTML.toLowerCase();
        var ports = row.cells[2].innerHTML.toLowerCase();
        if (ip.includes(input) || name.includes(input) || ports.includes(input)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}